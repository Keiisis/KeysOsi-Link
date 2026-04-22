// ════════════════════════════════════════════════════════════════
//  🌐 BROWSER — Playwright headless dans la sandbox aura-lab
//  Supporte : login auto, crawl JS-rendered, form fuzzing, screenshot
//  Auto-install playwright-python + chromium au premier usage.
// ════════════════════════════════════════════════════════════════
const { spawn } = require('child_process');
const fs = require('fs');

const WIN_DOCKER = 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe';
const DOCKER_BIN = (process.platform === 'win32' && fs.existsSync(WIN_DOCKER)) ? WIN_DOCKER : 'docker';
const CONTAINER = 'aura-lab';

function execInSandbox(cmd, { timeoutMs = 5 * 60 * 1000, onData } = {}) {
    return new Promise((resolve) => {
        const proc = spawn(DOCKER_BIN, ['exec', CONTAINER, 'bash', '-lc', cmd], { windowsHide: true });
        let stdout = '', stderr = '';
        const to = setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} }, timeoutMs);
        proc.stdout?.on('data', d => { const s = d.toString(); stdout += s; onData?.(s, 'stdout'); });
        proc.stderr?.on('data', d => { const s = d.toString(); stderr += s; onData?.(s, 'stderr'); });
        proc.on('close', code => { clearTimeout(to); resolve({ code, stdout, stderr }); });
        proc.on('error', err => { clearTimeout(to); resolve({ code: -1, stdout, stderr: err.message }); });
    });
}

// Script Python — ecrit dans /root/tools/aura_browser.py au 1er usage
const PY_SCRIPT = `#!/usr/bin/env python3
# aura_browser.py — automation Playwright pilotee par le node
import sys, json, asyncio, argparse, base64

def _log(msg): print(json.dumps({'_log': msg}), flush=True)

async def _launch(p):
    return await p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage'])

async def login(args):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await _launch(p)
        ctx = await browser.new_context(ignore_https_errors=True)
        page = await ctx.new_page()
        await page.goto(args.url, wait_until='domcontentloaded', timeout=30000)
        user_sel = args.user_sel or 'input[type="email"], input[type="text"], input[name*="user" i], input[name*="email" i], input[name*="login" i]'
        pwd_sel = args.pass_sel or 'input[type="password"]'
        submit_sel = args.submit_sel or 'button[type="submit"], input[type="submit"]'
        try:
            await page.locator(user_sel).first.fill(args.user, timeout=8000)
            await page.locator(pwd_sel).first.fill(args.pwd, timeout=8000)
        except Exception as e:
            return {'ok': False, 'stage': 'fill', 'error': str(e)}
        try:
            async with page.expect_navigation(wait_until='domcontentloaded', timeout=12000):
                await page.locator(submit_sel).first.click(timeout=5000)
        except Exception:
            try:
                await page.keyboard.press('Enter')
                await page.wait_for_load_state('domcontentloaded', timeout=8000)
            except Exception:
                pass
        cookies = await ctx.cookies()
        final_url = page.url
        title = await page.title()
        body_snippet = (await page.inner_text('body'))[:400]
        await browser.close()
        return {'ok': True, 'final_url': final_url, 'title': title, 'cookies': cookies, 'snippet': body_snippet}

async def crawl(args):
    from playwright.async_api import async_playwright
    cookies = json.loads(args.cookies) if args.cookies else None
    async with async_playwright() as p:
        browser = await _launch(p)
        ctx = await browser.new_context(ignore_https_errors=True)
        if cookies:
            try: await ctx.add_cookies(cookies)
            except Exception: pass
        seen = set(); endpoints = []; forms = []; xhr = []
        async def on_req(req):
            if req.resource_type in ('xhr','fetch'): xhr.append({'url':req.url,'method':req.method})
        queue = [(args.url, 0)]; max_pages = args.max_pages
        while queue and len(seen) < max_pages:
            u, d = queue.pop(0)
            if u in seen or d > args.depth: continue
            seen.add(u)
            page = await ctx.new_page()
            page.on('request', on_req)
            try:
                await page.goto(u, wait_until='domcontentloaded', timeout=20000)
                form_data = await page.evaluate('''() => [...document.querySelectorAll('form')].map(f => ({
                    action: f.action, method: (f.method||'get').toLowerCase(),
                    inputs: [...f.querySelectorAll('input,select,textarea')].map(i => ({name:i.name,type:i.type,value:i.value}))
                }))''')
                for f in form_data: forms.append({'page': u, **f})
                origin = await page.evaluate('() => new URL(location.href).origin')
                links = await page.evaluate('(o) => [...document.querySelectorAll(\\'a[href]\\')].map(a=>a.href).filter(h=>h.startsWith(o))', origin)
                for l in set(links):
                    endpoints.append(l)
                    if d+1 <= args.depth and l not in seen: queue.append((l, d+1))
            except Exception: pass
            await page.close()
        await browser.close()
        return {'ok': True, 'pages_seen': len(seen), 'endpoints': sorted(set(endpoints))[:300], 'forms': forms[:80], 'xhr': xhr[:200]}

async def fuzz(args):
    from playwright.async_api import async_playwright
    cookies = json.loads(args.cookies) if args.cookies else None
    payloads = json.loads(args.payloads) if args.payloads else ["'","<script>1</script>","\\"><img src=x>","' OR 1=1--"]
    target_field = args.field
    async with async_playwright() as p:
        browser = await _launch(p)
        ctx = await browser.new_context(ignore_https_errors=True)
        if cookies:
            try: await ctx.add_cookies(cookies)
            except Exception: pass
        results = []
        for pl in payloads:
            page = await ctx.new_page()
            try:
                await page.goto(args.url, wait_until='domcontentloaded', timeout=15000)
                sel = f'input[name="{target_field}"],textarea[name="{target_field}"]'
                await page.locator(sel).first.fill(pl, timeout=5000)
                form = page.locator(f'form:has({sel})').first
                resp = None
                try:
                    async with page.expect_response(lambda r: r.request.method in ('POST','GET'), timeout=8000) as r:
                        await form.evaluate('f => f.submit()')
                    resp = await r.value
                except Exception: pass
                body = await page.inner_text('body')
                anomaly = any(k in body.lower() for k in ['sql syntax','mysql','odbc','warning:','traceback','<script>1</script>'])
                reflected = pl in body
                results.append({'payload': pl, 'status': resp.status if resp else None, 'reflected': reflected, 'anomaly': anomaly, 'bodyLen': len(body)})
            except Exception as e:
                results.append({'payload': pl, 'error': str(e)})
            await page.close()
        await browser.close()
        return {'ok': True, 'field': target_field, 'results': results}

async def screenshot(args):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await _launch(p)
        ctx = await browser.new_context(ignore_https_errors=True)
        page = await ctx.new_page()
        await page.goto(args.url, wait_until='domcontentloaded', timeout=20000)
        png = await page.screenshot(full_page=True)
        await browser.close()
        return {'ok': True, 'png_b64': base64.b64encode(png).decode('ascii'), 'url': args.url}

def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest='cmd', required=True)
    pl = sub.add_parser('login')
    pl.add_argument('--url', required=True); pl.add_argument('--user', required=True)
    pl.add_argument('--pass', dest='pwd', required=True)
    pl.add_argument('--user-sel'); pl.add_argument('--pass-sel'); pl.add_argument('--submit-sel')
    pc = sub.add_parser('crawl')
    pc.add_argument('--url', required=True); pc.add_argument('--depth', type=int, default=1)
    pc.add_argument('--max-pages', type=int, default=40); pc.add_argument('--cookies', default='')
    pf = sub.add_parser('fuzz')
    pf.add_argument('--url', required=True); pf.add_argument('--field', required=True)
    pf.add_argument('--payloads', default=''); pf.add_argument('--cookies', default='')
    ps = sub.add_parser('screenshot'); ps.add_argument('--url', required=True)
    args = parser.parse_args()
    try:
        loop = asyncio.new_event_loop(); asyncio.set_event_loop(loop)
        if args.cmd == 'login': r = loop.run_until_complete(login(args))
        elif args.cmd == 'crawl': r = loop.run_until_complete(crawl(args))
        elif args.cmd == 'fuzz': r = loop.run_until_complete(fuzz(args))
        elif args.cmd == 'screenshot': r = loop.run_until_complete(screenshot(args))
        else: r = {'ok': False, 'error': 'unknown cmd'}
        print(json.dumps(r))
    except Exception as e:
        print(json.dumps({'ok': False, 'error': str(e)}))

if __name__ == '__main__':
    main()
`;

let _installed = false;
let _installing = null;

async function ensureInstalled({ onData } = {}) {
    if (_installed) return { ok: true, cached: true };
    if (_installing) return _installing;
    _installing = (async () => {
        onData?.('[browser] check playwright...\n');
        const check = await execInSandbox(`python3 -c "import playwright" 2>&1`, { timeoutMs: 15000 });
        if (check.code !== 0) {
            onData?.('[browser] installing playwright-python...\n');
            const r1 = await execInSandbox(`pip3 install --break-system-packages --quiet playwright 2>&1 | tail -20`, { timeoutMs: 5 * 60 * 1000, onData });
            if (r1.code !== 0) { _installing = null; return { ok: false, error: 'pip install playwright failed', log: r1.stdout + r1.stderr }; }
            onData?.('[browser] installing chromium (~200MB)...\n');
            const r2 = await execInSandbox(`python3 -m playwright install --with-deps chromium 2>&1 | tail -40`, { timeoutMs: 10 * 60 * 1000, onData });
            if (r2.code !== 0) { _installing = null; return { ok: false, error: 'playwright install chromium failed', log: r2.stdout + r2.stderr }; }
        }
        onData?.('[browser] deploying aura_browser.py...\n');
        const b64 = Buffer.from(PY_SCRIPT).toString('base64');
        const deploy = await execInSandbox(`mkdir -p /root/tools && echo ${b64} | base64 -d > /root/tools/aura_browser.py && chmod +x /root/tools/aura_browser.py && echo OK`);
        if (deploy.code !== 0) { _installing = null; return { ok: false, error: 'deploy script failed', log: deploy.stderr }; }
        _installed = true;
        _installing = null;
        return { ok: true };
    })();
    return _installing;
}

function shArg(s) { return `'${String(s).replace(/'/g, `'\\''`)}'`; }

async function invoke(args, { timeoutMs = 3 * 60 * 1000, onData } = {}) {
    const prep = await ensureInstalled({ onData });
    if (!prep.ok) return { ok: false, stage: 'install', ...prep };
    const cmdline = args.map(shArg).join(' ');
    const res = await execInSandbox(`python3 /root/tools/aura_browser.py ${cmdline}`, { timeoutMs, onData });
    const lines = (res.stdout || '').trim().split('\n').filter(Boolean);
    const last = lines[lines.length - 1] || '';
    try {
        const parsed = JSON.parse(last);
        return { ...parsed, _exitCode: res.code };
    } catch {
        return { ok: false, error: 'parse-failed', raw: (res.stdout + res.stderr).slice(-1500), _exitCode: res.code };
    }
}

async function login({ url, user, password, selectors = {} }, opts) {
    const a = ['login', '--url', url, '--user', user, '--pass', password];
    if (selectors.user) a.push('--user-sel', selectors.user);
    if (selectors.pass) a.push('--pass-sel', selectors.pass);
    if (selectors.submit) a.push('--submit-sel', selectors.submit);
    return invoke(a, opts);
}

async function crawl({ url, depth = 1, maxPages = 40, cookies = null }, opts) {
    const a = ['crawl', '--url', url, '--depth', String(depth), '--max-pages', String(maxPages)];
    if (cookies) a.push('--cookies', JSON.stringify(cookies));
    return invoke(a, opts);
}

async function fuzz({ url, field, payloads = null, cookies = null }, opts) {
    const a = ['fuzz', '--url', url, '--field', field];
    if (payloads) a.push('--payloads', JSON.stringify(payloads));
    if (cookies) a.push('--cookies', JSON.stringify(cookies));
    return invoke(a, opts);
}

async function screenshot({ url }, opts) {
    return invoke(['screenshot', '--url', url], opts);
}

module.exports = { ensureInstalled, login, crawl, fuzz, screenshot };
