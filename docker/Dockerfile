# ════════════════════════════════════════════════════════════════
#  ⚡ KEYSOSI LAB v2 — Full Offensive Sandbox (Kali Rolling)
#  Usage legal: CTF (HTB/THM/Root-Me), bug bounty scope, own lab.
#  Build : ~30 min, image finale ~6 GB
# ════════════════════════════════════════════════════════════════
FROM kalilinux/kali-rolling

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    TERM=xterm-256color \
    GOPATH=/opt/go \
    PATH=/opt/go/bin:/root/tools:/opt/custom:$PATH

# ── Core system + build toolchain ──
RUN apt-get update && apt-get install -y --no-install-recommends \
      bash-completion sudo ca-certificates curl wget git vim nano tmux screen \
      procps less man-db locales unzip zip p7zip-full file tree jq ripgrep fzf \
      build-essential pkg-config libssl-dev libffi-dev zlib1g-dev \
      python3 python3-pip python3-venv python3-dev \
      golang-go ruby ruby-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── Kali top-10 meta (nmap, metasploit-framework, sqlmap, hydra, john,
#    aircrack-ng, burpsuite, wireshark-cli, nikto, responder) ──
RUN apt-get update && apt-get install -y --no-install-recommends \
      kali-tools-top10 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── Web recon / fuzzing / wordlists ──
RUN apt-get update && apt-get install -y --no-install-recommends \
      gobuster dirb wfuzz ffuf feroxbuster whatweb wafw00f \
      seclists wordlists dirb dirbuster \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── Network / MITM / wifi / sniffing ──
RUN apt-get update && apt-get install -y --no-install-recommends \
      net-tools iputils-ping dnsutils traceroute whois \
      netcat-traditional socat ncat tcpdump tshark \
      bettercap mitmproxy \
      iptables arp-scan \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── Active Directory / Windows post-exploit ──
# rpcclient vient avec samba-common-bin (pas un package standalone)
RUN apt-get update && apt-get install -y --no-install-recommends \
      impacket-scripts crackmapexec \
      smbclient smbmap samba-common-bin evil-winrm \
      enum4linux ldap-utils \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── Reversing / binex / forensics ──
RUN apt-get update && apt-get install -y --no-install-recommends \
      radare2 gdb ltrace strace \
      binwalk foremost steghide exiftool \
      hexedit xxd bsdmainutils \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── Python pentest libs (PEP 668: --break-system-packages requis sur Kali) ──
RUN pip3 install --break-system-packages --no-cache-dir \
      pwntools impacket scapy paramiko requests beautifulsoup4 \
      bloodhound cryptography pyOpenSSL pycryptodome \
      dnspython pwncat-cs frida-tools \
    || echo "[WARN] some pip packages failed, continuing"

# ── ProjectDiscovery stack via go install (subfinder, httpx, nuclei, katana, naabu, dnsx) ──
RUN mkdir -p /opt/go && \
    go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest && \
    go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest && \
    go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest && \
    go install -v github.com/projectdiscovery/katana/cmd/katana@latest && \
    go install -v github.com/projectdiscovery/dnsx/cmd/dnsx@latest && \
    go clean -cache -modcache

# ── GEF (GDB Enhanced Features — CTF binex) ──
RUN wget -q -O /root/.gdbinit-gef.py https://gef.blah.cat/py && \
    echo 'source /root/.gdbinit-gef.py' > /root/.gdbinit || true

# ── Nuclei templates (vulnerability templates) ──
RUN nuclei -update-templates -silent 2>/dev/null || true

# ── Workspace structure + PATH persistence ──
WORKDIR /root
RUN mkdir -p /root/loot /root/tools /root/payloads /root/reports \
             /root/sessions /root/wordlists /opt/custom && \
    ln -s /usr/share/seclists /root/wordlists/seclists 2>/dev/null || true && \
    ln -s /usr/share/wordlists /root/wordlists/kali 2>/dev/null || true

# ── Kali-style prompt + QoL aliases ──
RUN cat > /root/.bashrc <<'BASHRC'
export TERM=xterm-256color
export PS1='\[\e[1;31m\]┌─[\[\e[1;33m\]aura-lab\[\e[1;31m\]]─[\[\e[1;32m\]\w\[\e[1;31m\]]\n└─\[\e[1;31m\]╼\[\e[0m\] '
export PATH="$PATH:/root/tools:/opt/custom:/opt/go/bin"
alias ll='ls -lah --color=auto'
alias la='ls -A --color=auto'
alias grep='grep --color=auto'
alias ..='cd ..'
alias ...='cd ../..'
alias serve='python3 -m http.server'
[ -f /root/.banner ] && cat /root/.banner
BASHRC

# ── Banner ──
RUN cat > /root/.banner <<'BANNER'

  ╔══════════════════════════════════════════════════════════════════╗
  ║   ⚡ KEYSOSI LAB v2 — Offensive Security Sandbox ⚡            ║
  ╠══════════════════════════════════════════════════════════════════╣
  ║  Pre-installed toolkit:                                          ║
  ║   • Exploitation  : metasploit, sqlmap, hydra, john, aircrack    ║
  ║   • Recon         : nmap, subfinder, httpx, nuclei, katana       ║
  ║   • Web           : gobuster, ffuf, feroxbuster, nikto, whatweb  ║
  ║   • AD/Windows    : impacket, crackmapexec, evil-winrm, bh.py    ║
  ║   • Binex/RE      : radare2, gdb+GEF, binwalk, steghide, pwntools║
  ║   • MITM/Network  : bettercap, mitmproxy, tcpdump, responder     ║
  ║   • Runtimes      : python3, go, ruby + dev libs                 ║
  ║                                                                  ║
  ║  Install a la volee    : apt install <pkg>   (survit au restart) ║
  ║  GitHub tools          : cd /root/tools && git clone ...         ║
  ║  Sessions (CTF/bounty) : /root/sessions/<engagement>/            ║
  ║  Wordlists             : /root/wordlists/{seclists,kali}/        ║
  ║                                                                  ║
  ║  Targets lab (si demarres)  :                                    ║
  ║    dvwa          http://dvwa                                     ║
  ║    juice-shop    http://juice-shop:3000                          ║
  ║    mutillidae    http://mutillidae                               ║
  ║    metasploitable    nmap metasploitable                         ║
  ╚══════════════════════════════════════════════════════════════════╝

BANNER

CMD ["tail", "-f", "/dev/null"]
