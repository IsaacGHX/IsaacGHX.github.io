'use strict';
function getElement(string, item = document.documentElement) {
    let tmp = item.querySelector(string);
    if (tmp === null) {
        throw new Error("Unknown HTML");
    }
    return tmp;
}
function getParent(item, level = 1) {
    while (level--) {
        let tmp = item.parentElement;
        if (tmp === null) {
            throw new Error("Unknown HTML");
        }
        item = tmp;
    }
    return item;
}
function format(format, ...args) {
    return format.replaceAll(/\$\*?[0-9]*/g, (match) => {
        if (match === '$*') {
            return '';
        }
        let Index = match.slice(1);
        if (Index >= args.length) {
            return '';
        }
        return args[Index];
    });
}
function isTypingOrModified(ev) {
    const target = ev.target;
    return ev.ctrlKey || ev.metaKey || ev.altKey || ev.isComposing ||
        !!target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);
}
const loadedResources = {};
function loadScript(src, timeout = 20000) {
    if (!loadedResources[src]) {
        loadedResources[src] = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            const fail = () => {
                clearTimeout(timer);
                delete loadedResources[src];
                reject(new Error('Failed to load ' + src));
            };
            const timer = setTimeout(fail, timeout);
            script.src = src;
            script.async = true;
            script.onload = () => { clearTimeout(timer); resolve(); };
            script.onerror = fail;
            document.head.appendChild(script);
        });
    }
    return loadedResources[src];
}
function loadStyle(href) {
    if (!loadedResources[href]) {
        loadedResources[href] = new Promise((resolve) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = link.onerror = () => resolve();
            document.head.appendChild(link);
        });
    }
    return loadedResources[href];
}
function onEveryPage(fn) {
    const run = () => {
        try {
            fn();
        }
        catch (e) {
            console.error(e);
        }
    };
    run();
    document.addEventListener('pjax:success', run);
}
function rafThrottle(fn) {
    let queued = false;
    return () => {
        if (queued)
            return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            fn();
        });
    };
}
class dust {
    constructor(x = 50, y = 50) {
        this.vx = Math.random() * 1 + 1;
        this.vy = Math.random() * 1 + 0.01;
        this.shadowBlur = Math.random() * 3;
        this.shadowX = (Math.random() * 2) - 1;
        this.shadowY = (Math.random() * 2) - 1;
        this.radiusX = Math.random() * 1.5 + 0.5;
        this.radiusY = this.radiusX * (Math.random() * (1.3 - 0.3) + 0.3);
        this.rotation = Math.PI * Math.floor(Math.random() * 2);
        this.x = x;
        this.y = y;
    }
}
class canvasDust {
    constructor(canvasID) {
        this.color = '#fff';
        this.width = 300;
        this.height = 300;
        this.dustQuantity = 50;
        this.dustArr = [];
        this.inStop = false;
        this.built = false;
        this.frame = 0;
        this.step = window.matchMedia('(pointer: coarse)').matches ? 2 : 1;
        this.build = () => {
            this.resize();
            if (this.ctx) {
                const point = canvasDust.getPoint(this.dustQuantity);
                for (let i of point) {
                    const dustObj = new dust(i[0], i[1]);
                    this.buildDust(dustObj);
                    this.dustArr.push(dustObj);
                }
                this.built = true;
                requestAnimationFrame(this.paint);
            }
        };
        this.paint = () => {
            if (this.inStop) {
                return;
            }
            if (++this.frame % this.step) {
                requestAnimationFrame(this.paint);
                return;
            }
            const step = this.step;
            const dustArr = this.dustArr;
            for (let i of dustArr) {
                this.ctx.clearRect(i.x - 6, i.y - 6, 12, 12);
                if (i.x < -5 || i.y < -5) {
                    const x = this.width;
                    const y = Math.floor(Math.random() * window.innerHeight);
                    i.x = x;
                    i.y = y;
                }
                else {
                    i.x -= i.vx * step;
                    i.y -= i.vy * step;
                }
            }
            for (let i of dustArr) {
                this.buildDust(i);
            }
            requestAnimationFrame(this.paint);
        };
        this.buildDust = (dust) => {
            const ctx = this.ctx;
            ctx.beginPath();
            ctx.shadowBlur = dust.shadowBlur;
            ctx.shadowOffsetX = dust.shadowX;
            ctx.shadowOffsetY = dust.shadowY;
            ctx.ellipse(dust.x, dust.y, dust.radiusX, dust.radiusY, dust.rotation, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
        };
        this.resize = () => {
            const canvas = this.canvas;
            const width = window.innerWidth;
            const height = window.innerHeight;
            if (this.built && width === this.width && Math.abs(height - this.height) < 160) {
                return;
            }
            this.width = width;
            this.height = height;
            this.dustQuantity = Math.floor((width + height) / 38);
            canvas.width = width;
            canvas.height = height;
            this.ctx.shadowColor =
                this.ctx.fillStyle = this.color;
        };
        this.stop = () => {
            this.inStop = true;
        };
        this.play = () => {
            if (this.inStop === true) {
                this.inStop = false;
                requestAnimationFrame(this.paint);
            }
        };
        const canvas = getElement(canvasID);
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.build();
        window.addEventListener('resize', this.resize, { passive: true });
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
            this.stop();
    }
}
canvasDust.getPoint = (number = 1) => {
    let point = [];
    for (let i = 0; i < number; ++i) {
        const x = Math.floor(Math.random() * window.innerWidth);
        const y = Math.floor(Math.random() * window.innerHeight);
        point.push([x, y]);
    }
    return point;
};
try {
    var canvasDusts = new canvasDust('#canvas-dust');
}
catch (e) { }
class expands {
    constructor() {
        this.reverse = (item, s0, s1) => {
            const block = getParent(item);
            if (block.classList.contains(s0)) {
                block.classList.remove(s0);
                block.classList.add(s1);
            }
            else {
                block.classList.remove(s1);
                block.classList.add(s0);
            }
        };
        this.addEvent = (header) => {
            header.addEventListener('click', (click) => {
                if (click.target.tagName !== 'BUTTON' &&
                    click.target.tagName !== 'A') {
                    this.reverse(header, 'open', 'fold');
                }
            });
            header.addEventListener('keypress', (key) => {
                if (key.key === 'Enter') {
                    this.reverse(header, 'open', 'fold');
                }
            });
        };
        this.setHTML = () => {
            document.querySelectorAll('.expand-box').forEach((item) => {
                const header = item.children[0];
                if (!header || header.dataset.expandBound)
                    return;
                header.dataset.expandBound = '';
                this.addEvent(header);
            });
        };
    }
}
let expand = new expands();
class Code {
    constructor() {
        this.mermaids = [];
        this.doAsMermaid = (item) => {
            let Amermaid = item.querySelector('.mermaid');
            item.outerHTML = '<div class="highlight mermaid">' + Amermaid.innerText + '</div>';
        };
        this.resetName = (str) => {
            if (str == 'plaintext') {
                return 'TEXT';
            }
            if (str == 'cs') {
                return 'C#';
            }
            if (str == 'cpp') {
                return 'C++';
            }
            return str.toUpperCase();
        };
        this.doAsCode = (item) => {
            const codeType = this.resetName(item.classList[1]), lineCount = getElement('.gutter', item).children[0].childElementCount >> 1;
            item.classList.add(lineCount < 16 ? 'open' : 'fold');
            item.classList.add('expand-box');
            item.innerHTML =
                `<div class="ex-header" tabindex='0'>
        <i class="i-status"></i>
        <span class="ex-title">${format(config.code.codeInfo, codeType, lineCount)}</span>
      </div>
      <div class="ex-content">${item.innerHTML}
        <button class="code-copy" title="${config.code.copy}"></button>
      </div>`;
            getElement('.code-copy', item).addEventListener('click', (click) => {
                const button = click.target;
                const text = getElement('code', item).innerText;
                const copied = () => {
                    button.classList.add('copied');
                    setTimeout(() => button.classList.remove('copied'), 1200);
                };
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(text).then(copied, () => { });
                }
                else {
                    const area = document.createElement('textarea');
                    area.value = text;
                    area.style.position = 'fixed';
                    area.style.opacity = '0';
                    document.body.appendChild(area);
                    area.select();
                    try {
                        if (document.execCommand('copy'))
                            copied();
                    }
                    catch (e) { }
                    area.remove();
                }
            });
        };
        this.paintMermaid = () => {
            if (typeof (mermaid) === 'undefined')
                return;
            mermaid.initialize(document.documentElement.getAttribute('theme-mode') === 'dark' ?
                { theme: 'dark' } : { theme: 'default' });
            if (typeof (mermaid.run) !== 'undefined') {
                mermaid.run({ querySelector: '.mermaid' });
            }
            else {
                mermaid.init();
            }
        };
        this.findCode = () => {
            let codeBlocks = document.querySelectorAll('.highlight');
            if (codeBlocks !== null) {
                codeBlocks.forEach(item => {
                    if (item.getAttribute('code-find') === null) {
                        try {
                            if (!item.classList.contains('mermaid') && item.querySelector('.code-header') === null) {
                                if (item.querySelector('.mermaid') !== null) {
                                    this.doAsMermaid(item);
                                }
                                else {
                                    this.doAsCode(item);
                                }
                            }
                        }
                        catch (e) {
                            return;
                        }
                        item.setAttribute('code-find', '');
                    }
                });
            }
            this.mermaids = [];
            document.querySelectorAll('.mermaid').forEach((item) => {
                this.mermaids.push(item.outerHTML);
            });
            expand.setHTML();
        };
        this.resetMermaid = () => {
            if (typeof (mermaid) === 'undefined' || !this.mermaids.length)
                return;
            let id = 0;
            document.querySelectorAll('.mermaid').forEach((item) => {
                item.outerHTML = this.mermaids[id];
                ++id;
            });
            this.paintMermaid();
        };
        this.findCode();
        document.addEventListener('pjax:success', this.findCode);
        window.addEventListener('hexo-blog-decrypt', this.findCode);
    }
}
let code = new Code();
class Cursor {
    constructor() {
        this.now = new MouseEvent('');
        this.first = true;
        this.last = 0;
        this.moveIng = false;
        this.fadeIng = false;
        this.nowX = 0;
        this.nowY = 0;
        this.attention = `a,input,button,textarea,
    .navBtnIcon,
    #post-content img,
    .ex-header,
    .gt-user-inner,
    .wl-sort>li,
    #valine .vicon,#valine .vat,
    .lg-container img,.clickable`;
        this.set = (X = this.nowX, Y = this.nowY) => {
            this.outer.transform =
                `translate(calc(${X.toFixed(2)}px - 50%),
                  calc(${Y.toFixed(2)}px - 50%))`;
        };
        this.move = (timestamp) => {
            if (this.now !== undefined) {
                let delX = this.now.x - this.nowX, delY = this.now.y - this.nowY;
                this.nowX += delX * Math.min(0.025 * (timestamp - this.last), 1);
                this.nowY += delY * Math.min(0.025 * (timestamp - this.last), 1);
                this.set();
                this.last = timestamp;
                if (Math.abs(delX) > 0.1 || Math.abs(delY) > 0.1) {
                    window.requestAnimationFrame(this.move);
                }
                else {
                    this.set(this.now.x, this.now.y);
                    this.moveIng = false;
                }
            }
        };
        this.reset = (mouse) => {
            this.outer.top = '0';
            this.outer.left = '0';
            if (!this.moveIng) {
                this.moveIng = true;
                window.requestAnimationFrame(this.move);
            }
            this.now = mouse;
            if (this.first) {
                this.first = false;
                this.nowX = this.now.x;
                this.nowY = this.now.y;
                this.set();
            }
        };
        this.Aeffect = (mouse) => {
            if (this.fadeIng == false) {
                this.fadeIng = true;
                this.effecter.left = String(mouse.x) + 'px';
                this.effecter.top = String(mouse.y) + 'px';
                this.effecter.transition =
                    'transform .5s cubic-bezier(0.22, 0.61, 0.21, 1)\
        ,opacity .5s cubic-bezier(0.22, 0.61, 0.21, 1)';
                this.effecter.transform = 'translate(-50%, -50%) scale(1)';
                this.effecter.opacity = '0';
                setTimeout(() => {
                    this.fadeIng = false;
                    this.effecter.transition = '';
                    this.effecter.transform = 'translate(-50%, -50%) scale(0)';
                    this.effecter.opacity = '1';
                }, 500);
            }
        };
        this.hold = () => {
            this.outer.height = '24px';
            this.outer.width = '24px';
            this.outer.background = "var(--theme-cursor-bg)";
        };
        this.relax = () => {
            this.outer.height = '36px';
            this.outer.width = '36px';
            this.outer.background = "unset";
        };
        this.onOver = (event) => {
            const target = event.target;
            const hit = target && target.closest ? target.closest(this.attention) : null;
            if (hit && !hit.classList.contains('is--active'))
                this.hold();
            else
                this.relax();
        };
        let node = document.createElement('div');
        node.id = 'cursor-container';
        node.innerHTML = `<div id="cursor-outer"></div><div id="cursor-effect"></div>`;
        document.body.appendChild(node);
        this.outer = getElement('#cursor-outer', node).style;
        this.outer.top = '-100%';
        this.effecter = getElement('#cursor-effect', node).style;
        this.effecter.transform = 'translate(-50%, -50%) scale(0)';
        this.effecter.opacity = '1';
        window.addEventListener('mousemove', this.reset, { passive: true });
        window.addEventListener('click', this.Aeffect, { passive: true });
        document.addEventListener('mouseover', this.onOver, { passive: true });
    }
}
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches)
    new Cursor();
class Header {
    constructor() {
        this.header = getElement('header');
        this.button = getElement('.navBtnIcon');
        this.closeSearch = false;
        this.readyRev = true;
        this.relabel = () => {
            let navs = this.header.querySelectorAll('.navItem'), mayLen = 0, may = navs.item(0);
            navs.forEach(item => {
                try {
                    let now = item, link = getElement('a', now);
                    if (link !== null) {
                        let href = link.href, match = now.getAttribute('matchdata');
                        now.classList.remove('active');
                        if (getParent(link) != now) {
                            return;
                        }
                        if (href.length > mayLen && document.URL.startsWith(href)) {
                            mayLen = href.length;
                            may = now;
                        }
                        if (match) {
                            const s = match.split(',');
                            s.forEach(item => {
                                if (document.URL.includes('/' + item + '/')) {
                                    may = now;
                                    mayLen = Infinity;
                                }
                            });
                        }
                    }
                }
                catch (e) { }
            });
            if (may !== null) {
                do {
                    if (may.classList.contains('navItem')) {
                        may.classList.add('active');
                    }
                } while (!(may = getParent(may)).classList.contains('navContent'));
            }
        };
        this.inHeader = (mouse) => {
            let range = this.header.getBoundingClientRect();
            if (mouse.clientX < range.x || mouse.clientY < range.y ||
                mouse.clientX > range.right || mouse.clientY > range.bottom) {
                this.close();
            }
        };
        this.open = (item = this.header) => {
            item.classList.add('expanded');
            item.classList.remove('closed');
            scrolls.slideDown();
            if (item === this.header) {
                item.classList.add('moving');
                setTimeout(() => item.classList.remove('moving'), 300);
            }
            document.addEventListener('click', this.inHeader);
        };
        this.close = (item = this.header) => {
            document.removeEventListener('click', this.inHeader);
            item.classList.add('closed');
            item.classList.remove('expanded');
            if (item === this.header) {
                item.classList.add('moving');
                setTimeout(() => item.classList.remove('moving'), 300);
                this.closeAll();
                getElement('nav', item).classList.remove('moved');
            }
        };
        this.reverse = (item = this.header) => {
            if (this.closeSearch) {
                this.closeSearch = false;
                return;
            }
            if (!this.readyRev) {
                return;
            }
            this.readyRev = false;
            if (item.classList.contains('expanded')) {
                this.close(item);
            }
            else {
                this.open(item);
            }
            setTimeout(() => this.readyRev = true, 300);
        };
        this.closeAll = () => {
            this.header.querySelectorAll('.expanded').forEach((item) => item.classList.remove('expanded'));
        };
        this.relabel();
        document.addEventListener('pjax:success', this.relabel);
        document.addEventListener('pjax:send', () => this.close());
        this.button.addEventListener('mousedown', () => {
            if (document.querySelector('.search')) {
                this.closeSearch = true;
            }
        });
        this.button.onclick = () => this.reverse(this.header);
        document.querySelectorAll('.navItemList').forEach((item) => {
            item = getParent(item);
            item.addEventListener('click', (event) => {
                if (getParent(event.target) === item) {
                    this.reverse(item);
                }
            });
        });
    }
}
var header = new Header();
class Toc {
    static targetOf(href) {
        const hash = href.split('#')[1];
        if (!hash)
            return null;
        let id = hash;
        try {
            id = decodeURIComponent(hash);
        }
        catch (e) { }
        return document.getElementById(id);
    }
    constructor() {
        this.main = getElement('main');
        this.entries = [];
        this.active = null;
        this.lists = [];
        this.animate = false;
        this.lockUntil = 0;
        this.lockTimer = 0;
        this.smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.offset = () => (window.innerWidth <= 768 ? 64 : 16);
        this.setFolded = (list, folded) => {
            if (list.classList.contains('is-folded') === folded)
                return;
            list.classList.toggle('is-folded', folded);
            if (!this.animate || window.innerWidth <= 768 || !this.smooth) {
                list.style.maxHeight = '';
                return;
            }
            list.style.maxHeight = (folded ? list.scrollHeight : 0) + 'px';
            void list.offsetHeight;
            list.style.maxHeight = (folded ? 0 : list.scrollHeight) + 'px';
            const done = (e) => {
                if (e.target !== list)
                    return;
                list.removeEventListener('transitionend', done);
                list.style.maxHeight = '';
            };
            list.addEventListener('transitionend', done);
        };
        this.setActive = (link) => {
            if (link === this.active)
                return;
            this.active?.classList.remove('active');
            this.active = link;
            if (link)
                link.classList.add('active');
            for (const list of this.lists) {
                const owner = list.parentElement;
                this.setFolded(list, !!link && !owner.contains(link));
            }
            if (link)
                this.revealInAside(link);
        };
        this.revealInAside = (link) => {
            const aside = link.closest('aside');
            if (!aside || window.innerWidth <= 768 || aside.scrollHeight <= aside.clientHeight)
                return;
            setTimeout(() => {
                if (link !== this.active)
                    return;
                const a = aside.getBoundingClientRect(), r = link.getBoundingClientRect();
                if (r.top >= a.top + 60 && r.bottom <= a.bottom - 60)
                    return;
                aside.scrollTo({
                    top: aside.scrollTop + r.top - a.top - aside.clientHeight / 3,
                    behavior: this.smooth ? 'smooth' : 'auto'
                });
            }, 320);
        };
        this.update = () => {
            if (!this.entries.length || performance.now() < this.lockUntil)
                return;
            const main = this.main;
            const line = main.getBoundingClientRect().top + this.offset() + 32;
            let current = null;
            for (const { link, heading } of this.entries) {
                if (heading.getBoundingClientRect().top <= line)
                    current = link;
                else
                    break;
            }
            if (main.scrollTop + main.clientHeight >= main.scrollHeight - 2) {
                current = this.entries[this.entries.length - 1].link;
            }
            this.setActive(current || this.entries[0].link);
        };
        this.scrollToElement = (target) => {
            const main = this.main;
            const top = main.scrollTop + target.getBoundingClientRect().top - main.getBoundingClientRect().top - this.offset();
            main.scrollTo({ top: Math.max(0, top), behavior: this.smooth ? 'smooth' : 'auto' });
        };
        this.onClick = (event) => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
                return;
            const anchor = event.target.closest ? event.target.closest('a[href*="#"]') : null;
            if (!anchor || anchor.target === '_blank')
                return;
            if (anchor.origin + anchor.pathname !== location.origin + location.pathname)
                return;
            const target = Toc.targetOf(anchor.getAttribute('href') || '');
            if (!target || !this.main.contains(target))
                return;
            event.preventDefault();
            const entry = this.entries.find((e) => e.heading === target);
            if (entry)
                this.setActive(entry.link);
            document.querySelectorAll('.is-target').forEach((el) => el.classList.remove('is-target'));
            target.classList.add('is-target');
            history.replaceState(history.state, '', '#' + encodeURIComponent(target.id));
            if (document.querySelector('header.expanded'))
                header.close();
            this.jumpTarget = target;
            this.corrections = 0;
            this.lockUntil = Infinity;
            this.scrollToElement(target);
            clearTimeout(this.lockTimer);
            this.lockTimer = window.setTimeout(this.release, 900);
        };
        this.jumpTarget = null;
        this.corrections = 0;
        this.release = () => {
            const target = this.jumpTarget;
            const main = this.main;
            if (target && target.isConnected && this.corrections < 3) {
                const drift = target.getBoundingClientRect().top - main.getBoundingClientRect().top - this.offset();
                const atBottom = main.scrollTop + main.clientHeight >= main.scrollHeight - 2;
                if (Math.abs(drift) > 4 && !(drift > 0 && atBottom)) {
                    this.corrections++;
                    this.scrollToElement(target);
                    clearTimeout(this.lockTimer);
                    this.lockTimer = window.setTimeout(this.release, 900);
                    return;
                }
            }
            this.jumpTarget = null;
            this.lockUntil = 0;
            if (!this.entries.some((e) => e.heading === target))
                this.update();
        };
        this.onScroll = () => {
            if (this.lockUntil === Infinity) {
                clearTimeout(this.lockTimer);
                this.lockTimer = window.setTimeout(this.release, 140);
                return;
            }
            this.spy();
        };
        this.spy = rafThrottle(this.update);
        this.setHTML = () => {
            this.active = null;
            this.animate = false;
            this.lists = Array.from(document.querySelectorAll('#toc-div .toc-child'));
            this.lockUntil = 0;
            this.jumpTarget = null;
            this.entries = [];
            document.querySelectorAll('#toc-div .toc-link').forEach((link) => {
                const heading = Toc.targetOf(link.getAttribute('href') || '');
                if (heading)
                    this.entries.push({ link, heading });
                const text = link.querySelector('.toc-text');
                if (text)
                    link.title = text.textContent || '';
            });
            this.entries.sort((a, b) => a.heading.compareDocumentPosition(b.heading) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
            this.update();
            this.animate = true;
        };
        document.addEventListener('click', this.onClick);
        this.main.addEventListener('scroll', this.onScroll, { passive: true });
        window.addEventListener('resize', this.spy, { passive: true });
        document.addEventListener('pjax:success', this.setHTML);
        window.addEventListener('hexo-blog-decrypt', this.setHTML);
        this.setHTML();
    }
}
var toc = new Toc();
class Scroll {
    constructor() {
        this.scrolling = 0;
        this.getingtop = false;
        this.height = 0;
        this.visible = false;
        this.touchX = 0;
        this.touchY = 0x7fffffff;
        this.notMoveY = false;
        this.reallyUp = false;
        this.intop = false;
        this.totop = null;
        this.main = getElement('main');
        this.navBtn = getElement('.navBtn');
        this.articleTop = () => {
            const article = document.querySelector('article');
            return article ? article.getBoundingClientRect().top : 0;
        };
        this.scrolltop = () => {
            this.main.scroll({ top: 0, left: 0, behavior: 'smooth' });
            this.getingtop = true;
            this.visible = false;
            if (this.totop) {
                const totop = this.totop;
                totop.style.opacity = '0';
                setTimeout(() => totop.style.display = 'none', 300);
            }
        };
        this.totopChange = (top) => {
            const totop = this.totop;
            if (!totop)
                return;
            if (top < -200) {
                if (this.visible)
                    return;
                totop.style.display = '';
                this.visible = true;
                setTimeout(() => {
                    if (this.visible) {
                        totop.style.opacity = '1';
                    }
                }, 300);
            }
            else {
                if (!this.visible && totop.style.display === 'none')
                    return;
                totop.style.opacity = '0';
                this.visible = false;
                setTimeout(() => {
                    if (!this.visible) {
                        totop.style.display = 'none';
                    }
                }, 300);
            }
        };
        this.slideDown = () => {
            if (!this.intop) {
                return;
            }
            const main = this.main.classList;
            if (!document.querySelector('.expanded')) {
                this.navBtn.classList.add('hide-btn');
            }
            main.remove('up');
            main.add('down');
            main.add('moving');
            setTimeout(() => {
                main.remove('down');
                main.remove('moving');
            }, 300);
            this.intop = false;
        };
        this.slideUp = () => {
            if (this.intop || document.querySelector('.moving')) {
                return;
            }
            this.navBtn.classList.remove('hide-btn');
            if (!document.querySelector('#search-header')) {
                return;
            }
            const main = this.main.classList;
            main.remove('down');
            main.add('up');
            main.add('moving');
            this.intop = true;
            setTimeout(() => main.remove('moving'), 300);
        };
        this.onScroll = rafThrottle(() => {
            const nowheight = this.articleTop();
            if (nowheight > 0) {
                return;
            }
            if (!document.querySelector('.expanded')) {
                if (this.height - nowheight > 100) {
                    this.navBtn.classList.add('hide-btn');
                    this.height = nowheight;
                }
                else if (nowheight > this.height) {
                    if (nowheight - this.height > 20) {
                        this.navBtn.classList.remove('hide-btn');
                    }
                    this.height = nowheight;
                }
            }
            ++this.scrolling;
            setTimeout(() => {
                if (!--this.scrolling) {
                    this.getingtop = false;
                }
            }, 100);
            if (!this.getingtop) {
                this.totopChange(nowheight);
            }
        });
        this.setHTML = () => {
            this.height = 0;
            this.visible = false;
            this.totop = document.querySelector('#to-top');
        };
        this.checkTouchMove = (event) => {
            if (Math.abs(event.changedTouches[0].screenX - this.touchX) > 50 &&
                !this.reallyUp) {
                this.notMoveY = true;
            }
            if (document.querySelector('.expanded') ||
                window.innerWidth > 1024 ||
                this.notMoveY ||
                event.changedTouches[0].screenY === this.touchY ||
                document.querySelector('.moving')) {
                return;
            }
            if (this.intop || this.articleTop() >= 0) {
                this.reallyUp = true;
                if (event.changedTouches[0].screenY > this.touchY) {
                    this.slideUp();
                }
                else {
                    this.slideDown();
                }
                this.touchY = event.changedTouches[0].screenY;
            }
        };
        this.startTouch = (event) => {
            this.touchX = event.changedTouches[0].screenX;
            this.touchY = event.changedTouches[0].screenY;
            this.notMoveY = false;
        };
        this.checkPos = () => {
            if (this.articleTop() < 0 && this.intop) {
                this.slideDown();
            }
        };
        this.main.addEventListener('scroll', this.onScroll, { passive: true });
        document.addEventListener('pjax:success', this.setHTML);
        document.addEventListener('touchstart', this.startTouch, { passive: true });
        document.addEventListener('touchmove', this.checkTouchMove, { passive: true });
        document.addEventListener('touchend', this.checkPos, { passive: true });
        document.addEventListener('wheel', (event) => {
            if (document.querySelector('.expanded') || window.innerWidth > 1024) {
                return;
            }
            if (this.articleTop() >= 0) {
                if (event.deltaY < 0) {
                    this.slideUp();
                }
                else {
                    this.slideDown();
                }
            }
        }, { passive: true });
        this.setHTML();
    }
}
var scrolls = new Scroll();
class pjaxSupport {
    constructor() {
        this.loading = getElement('.loading');
        this.left = getElement('.loadingBar.left');
        this.right = getElement('.loadingBar.right');
        this.timestamp = 0;
        this.start = (need) => {
            this.left.style.transform = `scaleX(${need})`;
            this.right.style.transform = `scaleX(${need})`;
            ++this.timestamp;
        };
        this.loaded = () => {
            getElement('main').scrollTop = 0;
            this.start(1);
            setTimeout((time) => {
                if (this.timestamp === time) {
                    this.loading.style.opacity = '0';
                }
            }, 600, this.timestamp);
        };
        this.fail = () => {
            setTimeout((time) => {
                if (this.timestamp !== time) {
                    return;
                }
                this.start(0);
                this.loading.classList.add('fail');
                setTimeout((time) => {
                    if (this.timestamp === time) {
                        this.loading.style.opacity = '0';
                        this.loading.classList.remove('fail');
                    }
                }, 600, this.timestamp);
            }, 600, this.timestamp);
        };
        document.addEventListener('pjax:send', () => {
            if (getElement('main').classList.contains('up')) {
                scrolls.slideDown();
            }
            this.loading.classList.add('reset');
            this.loading.classList.remove('fail');
            this.start(0);
            setTimeout((time) => {
                if (this.timestamp !== time) {
                    return;
                }
                this.loading.classList.remove('reset');
                this.start(0.3);
                this.loading.style.opacity = '1';
                setTimeout((time) => {
                    if (this.timestamp === time) {
                        this.start(0.6);
                    }
                }, 1200, this.timestamp);
            }, 0, this.timestamp);
        });
        document.addEventListener('pjax:start', this.loaded);
        document.addEventListener('pjax:error', this.fail);
        if (typeof Pjax !== 'undefined') {
            window.pjax = new Pjax({
                cacheBust: false,
                selectors: ['title', 'article', '#aside-block'],
                switches: { 'article': Pjax.switches.sideBySide },
                switchesOptions: {
                    'article': {
                        classNames: {
                            remove: 'pjax-out',
                            add: 'pjax-in'
                        }
                    }
                }
            });
        }
    }
}
try {
    if (document.querySelector('.loading'))
        new pjaxSupport();
}
catch (e) { }
class ColorMode {
    get dark() {
        return this.html.getAttribute('theme-mode') === 'dark';
    }
    userChoice() {
        try {
            return localStorage.getItem(this.storageKey);
        }
        catch (e) {
            return null;
        }
    }
    constructor() {
        this.html = document.documentElement;
        this.storageKey = 'theme-mode-user';
        this.inChanging = false;
        this.apply = (toDark, remember) => {
            if (this.inChanging || toDark === this.dark)
                return;
            this.inChanging = true;
            const btn = document.getElementById('color-mode');
            const background = document.createElement('div');
            background.style.transition = '1.5s';
            background.innerHTML =
                `<div style='background: var(--${this.dark ? 'dark' : 'light'}-background);
        height: 100vh; width: 100vw;
        position: fixed; left: 0; top: 0; z-index: -99999;
        background-position: 50% 0;
        background-repeat: no-repeat;
        background-size: cover;'></div>`;
            document.body.insertBefore(background, document.body.firstChild);
            if (btn)
                btn.style.pointerEvents = 'none';
            setTimeout(() => {
                if (canvasDusts)
                    canvasDusts.stop();
                const mode = toDark ? 'dark' : 'light';
                this.html.setAttribute('theme-mode', mode);
                if (remember) {
                    try {
                        localStorage.setItem(this.storageKey, mode);
                    }
                    catch (e) { }
                }
                background.style.opacity = '0';
                code.resetMermaid();
            });
            setTimeout(() => {
                background.remove();
                if (canvasDusts && !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
                    canvasDusts.play();
            }, 1500);
            setTimeout(() => {
                if (btn)
                    btn.style.pointerEvents = '';
                this.inChanging = false;
            }, 1000);
        };
        this.change = () => this.apply(!this.dark, true);
        this.follow = () => {
            if (this.userChoice() === null)
                this.apply(themeAuto() === 'dark', false);
        };
        if (/-only$/.test(config.color.mode))
            return;
        document.addEventListener('keypress', (ev) => {
            if (ev.key === 'c' && !isTypingOrModified(ev))
                this.change();
        });
        if (config.color.mode === 'time')
            setInterval(this.follow, 15 * 60 * 1000);
        if (config.color.mode === 'auto') {
            const query = window.matchMedia('(prefers-color-scheme: dark)');
            if (query.addEventListener)
                query.addEventListener('change', this.follow);
        }
    }
}
try {
    var colorMode = new ColorMode();
}
catch (e) { }
class Pair {
    constructor(first, second) {
        this.comment = first;
        this.button = second;
    }
}
class Selectors {
    constructor(elements = [], active = 0) {
        this.elements = [];
        this.changeTo = (item) => {
            if (item === this.nowActive) {
                return;
            }
            this.nowActive.comment.style.display = 'none';
            this.nowActive.button.classList.remove('active');
            item.comment.style.display = '';
            item.button.classList.add('active');
            this.nowActive = item;
        };
        this.elements = elements;
        this.nowActive = this.elements[active];
        this.elements.forEach((item) => item.comment.style.display = 'none');
        this.nowActive = this.elements[0];
        for (let i of this.elements) {
            i.button.addEventListener('click', () => this.changeTo(i));
        }
        this.nowActive.comment.style.display = '';
        this.nowActive.button.classList.add('active');
    }
}
class Comments {
    constructor() {
        this.search = ["valine", "gitalk", "waline", "artalk"];
        this.elements = [];
        this.setHTML = () => {
            if (!document.querySelector('#comments .selector'))
                return;
            this.elements = [];
            this.search.forEach((item) => {
                try {
                    this.elements.push(new Pair(getElement(`#${item}`), getElement(`.${item}-sel`)));
                }
                catch (e) { }
            });
            new Selectors(this.elements, 0);
        };
        this.setHTML();
        document.addEventListener('pjax:complete', this.setHTML);
    }
}
new Comments();
class Plugins {
    static jsonp(url, timeout) {
        return new Promise((resolve, reject) => {
            const name = 'BusuanziCallback_' + Math.floor(Math.random() * 1e12);
            const script = document.createElement('script');
            const w = window;
            const done = () => {
                clearTimeout(timer);
                script.remove();
                w[name] = () => { };
            };
            const timer = setTimeout(() => { done(); reject(new Error('timeout')); }, timeout);
            w[name] = (data) => { done(); resolve(data); };
            script.onerror = () => { done(); reject(new Error('network')); };
            script.referrerPolicy = 'no-referrer-when-downgrade';
            script.src = url + '?jsonpCallback=' + name;
            document.head.appendChild(script);
        });
    }
    static commentId() {
        const path = location.pathname.replace(/index\.html$/, '');
        if (path.length <= 50)
            return path;
        let h1 = 0x811c9dc5, h2 = 0x01000193;
        for (let i = 0; i < path.length; i++) {
            const c = path.charCodeAt(i);
            h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
            h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
        }
        return 'p-' + h1.toString(16) + h2.toString(16);
    }
    constructor() {
        this.gallery = null;
        this.commentObserver = null;
        this.mermaidRequested = false;
        this.counterRun = 0;
        this.counter = () => {
            const cfg = config.plugins.busuanzi;
            if (!cfg)
                return;
            const keys = ['site_pv', 'site_uv', 'page_pv'];
            const show = (data) => keys.forEach((key) => {
                const el = document.getElementById('busuanzi_value_' + key);
                if (el && data && data[key] !== undefined) {
                    el.textContent = Number(data[key]).toLocaleString('en-US');
                    el.dataset.ready = '';
                }
            });
            try {
                show(JSON.parse(sessionStorage.getItem('busuanzi-site') || 'null'));
            }
            catch (e) { }
            const run = ++this.counterRun;
            const api = 'https://busuanzi.ibruce.info/busuanzi';
            Plugins.jsonp(api, 10000).catch((err) => {
                if (err.message !== 'network' || run !== this.counterRun)
                    throw err;
                return new Promise((r) => setTimeout(r, 1500)).then(() => Plugins.jsonp(api, 10000));
            }).then((data) => {
                if (run !== this.counterRun)
                    return;
                show(data);
                try {
                    sessionStorage.setItem('busuanzi-site', JSON.stringify({ site_pv: data.site_pv, site_uv: data.site_uv }));
                }
                catch (e) { }
            }).catch(() => {
                if (run !== this.counterRun)
                    return;
                keys.forEach((key) => {
                    const el = document.getElementById('busuanzi_value_' + key);
                    if (el && el.dataset.ready === undefined)
                        el.textContent = cfg.fail;
                });
            });
        };
        this.math = () => {
            const src = config.plugins.mathjax;
            const article = document.querySelector('article');
            if (!src || !article)
                return;
            if (!article.querySelector('script[type^="math/tex"]') &&
                !/\\\(|\\\[/.test(article.textContent || ''))
                return;
            const w = window;
            if (w.MathJax && w.MathJax.Hub) {
                MathJax.Hub.Queue(['Typeset', MathJax.Hub, article]);
                return;
            }
            w.MathJax = {
                menuSettings: { zoom: 'None' },
                showMathMenu: false,
                jax: ['input/TeX', 'output/CommonHTML'],
                extensions: ['tex2jax.js'],
                TeX: { extensions: ['AMSmath.js', 'AMSsymbols.js'], equationNumbers: { autoNumber: 'AMS' } },
                tex2jax: { inlineMath: [['\\(', '\\)']], displayMath: [['\\[', '\\]']] }
            };
            loadScript(src).catch(() => { delete w.MathJax; });
        };
        this.mermaid = () => {
            const src = config.plugins.mermaid;
            if (!src || !document.querySelector('.mermaid'))
                return;
            if (typeof mermaid !== 'undefined') {
                code.paintMermaid();
                return;
            }
            if (this.mermaidRequested)
                return;
            this.mermaidRequested = true;
            window.addEventListener('mermaid-ready', () => code.paintMermaid(), { once: true });
            const script = document.createElement('script');
            script.type = 'module';
            script.textContent = `import m from ${JSON.stringify(src)};
      window.mermaid = m; window.dispatchEvent(new Event('mermaid-ready'));`;
            document.head.appendChild(script);
        };
        this.lightbox = () => {
            if (this.gallery) {
                try {
                    this.gallery.destroy();
                }
                catch (e) { }
                this.gallery = null;
            }
            const root = document.getElementById('post-bg');
            if (!root || !root.querySelector('.item-img'))
                return;
            const lg = config.plugins.lightgallery;
            lg.css.forEach(loadStyle);
            lg.js.reduce((chain, src) => chain.then(() => loadScript(src)), Promise.resolve())
                .then(() => {
                if (!root.isConnected)
                    return;
                this.gallery = lightGallery(root, {
                    plugins: [lgZoom, lgThumbnail],
                    selector: '.item-img',
                    licenseKey: '0000-0000-000-0000'
                });
            })
                .catch(() => { });
        };
        this.encrypt = () => {
            if (!document.getElementById('hexo-blog-encrypt'))
                return;
            const enc = config.plugins.encrypt;
            loadStyle(enc.css);
            loadScript(enc.js).catch(() => { });
        };
        this.commentLoaders = {
            gitalk: (el, c) => loadScript(c.src).then(() => {
                el.innerHTML = '';
                new Gitalk({
                    clientID: c.clientID,
                    clientSecret: c.clientSecret,
                    repo: c.repo,
                    owner: c.owner,
                    admin: c.admin,
                    distractionFreeMode: c.distractionFreeMode,
                    id: Plugins.commentId()
                }).render(el);
            }),
            valine: (el, c) => loadScript(c.src).then(() => {
                new Valine({
                    el: el, appId: c.appId, appKey: c.appKey, serverURLs: c.serverURLs,
                    placeholder: c.placeholder, path: location.pathname,
                    avatar: c.avatar, avatar_cdn: c.avatar_cdn
                });
            }),
            waline: (el, c) => {
                if (c.css)
                    loadStyle(c.css);
                return loadScript(c.src).then(() => {
                    Waline.init({ el: el, dark: ':root[theme-mode="dark"]', serverURL: c.serverURL, path: location.pathname });
                });
            },
            artalk: (el, c) => {
                if (c.css)
                    loadStyle(c.css);
                return loadScript(c.src).then(() => {
                    Artalk.init({
                        el: el, server: c.server, site: c.site,
                        darkMode: document.documentElement.getAttribute('theme-mode') === 'dark'
                    });
                });
            }
        };
        this.comments = () => {
            if (this.commentObserver)
                this.commentObserver.disconnect();
            const plugins = config.plugins;
            const targets = [];
            for (const name of Object.keys(this.commentLoaders)) {
                const el = document.getElementById(name);
                if (el && plugins[name])
                    targets.push([el, name]);
            }
            if (!targets.length)
                return;
            const load = () => targets.forEach(([el, name]) => {
                this.commentLoaders[name](el, plugins[name]).catch(() => {
                    if (el.isConnected)
                        el.textContent = 'Comments failed to load. Please refresh to retry.';
                });
            });
            const main = document.querySelector('main');
            if (!('IntersectionObserver' in window) || !main)
                return load();
            this.commentObserver = new IntersectionObserver((entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    this.commentObserver.disconnect();
                    load();
                }
            }, { root: main, rootMargin: '800px 0px' });
            targets.forEach(([el]) => this.commentObserver.observe(el));
        };
        onEveryPage(this.counter);
        onEveryPage(this.math);
        onEveryPage(this.mermaid);
        onEveryPage(this.lightbox);
        onEveryPage(this.encrypt);
        onEveryPage(this.comments);
    }
}
new Plugins();
const typingFrames = new WeakMap();
function typeOut(box) {
    const target = box.querySelector('p') || box;
    const previous = typingFrames.get(target);
    if (previous !== undefined)
        cancelAnimationFrame(previous);
    if (target.dataset.fullText === undefined) {
        if (target.children.length)
            return;
        target.dataset.fullText = (target.textContent || '').replace(/\s+/g, ' ').trim();
    }
    const full = target.dataset.fullText;
    if (!full || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        target.textContent = full || '';
        return;
    }
    const typed = document.createElement('span');
    const caret = document.createElement('span');
    const rest = document.createElement('span');
    caret.className = 'typing-caret';
    caret.setAttribute('aria-hidden', 'true');
    rest.className = 'typing-rest';
    rest.textContent = full;
    target.replaceChildren(typed, caret, rest);
    const duration = Math.min(1600, Math.max(600, full.length * 2));
    const start = performance.now();
    const step = (now) => {
        const shown = Math.min(full.length, Math.ceil(full.length * (now - start) / duration));
        typed.textContent = full.slice(0, shown);
        rest.textContent = full.slice(shown);
        if (shown < full.length) {
            typingFrames.set(target, requestAnimationFrame(step));
            return;
        }
        typingFrames.delete(target);
        rest.remove();
        setTimeout(() => {
            if (caret.isConnected && !typingFrames.has(target))
                target.textContent = full;
        }, 900);
    };
    typingFrames.set(target, requestAnimationFrame(step));
}
window.typeOut = typeOut;
class LogoEgg {
    constructor(logo, img) {
        this.canvas = null;
        this.ctx = null;
        this.tinted = null;
        this.n = 0;
        this.bits = null;
        this.order = null;
        this.pts = null;
        this.state = 'idle';
        this.phaseStart = 0;
        this.raf = 0;
        this.autoExit = 0;
        this.W = 0;
        this.dpr = 1;
        this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.down = false;
        this.rolled = false;
        this.moved = 0;
        this.reversals = 0;
        this.lastX = 0;
        this.lastY = 0;
        this.segStart = 0;
        this.dir = 0;
        this.suppressClick = false;
        this.onDown = (e) => {
            if (e.button !== 0 || window.innerWidth <= 768)
                return;
            this.down = true;
            this.rolled = false;
            this.suppressClick = false;
            this.moved = 0;
            this.reversals = 0;
            this.dir = 0;
            this.lastX = this.segStart = e.clientX;
            this.lastY = e.clientY;
            try {
                this.logo.setPointerCapture(e.pointerId);
            }
            catch (err) { }
        };
        this.onMove = (e) => {
            if (!this.down)
                return;
            const dx = e.clientX - this.lastX;
            this.moved += Math.abs(dx) + Math.abs(e.clientY - this.lastY);
            this.lastX = e.clientX;
            this.lastY = e.clientY;
            if (this.moved > 6)
                this.suppressClick = true;
            const d = Math.sign(dx);
            if (d && d !== this.dir) {
                if (this.dir && Math.abs(e.clientX - this.segStart) > 14)
                    this.reversals++;
                this.dir = d;
                this.segStart = e.clientX;
            }
            if (this.state !== 'idle' || this.rolled)
                return;
            const p = Math.min(1, this.reversals / 4);
            this.img.style.transform = p ? `translateX(${((Math.random() - 0.5) * 6 * p).toFixed(1)}px)` : '';
            this.img.style.opacity = String(1 - p * 0.25 * Math.random());
            if (this.reversals >= 4) {
                this.rolled = true;
                if (Math.random() < LogoEgg.CHANCE)
                    this.enter();
                else
                    this.resetImg();
            }
        };
        this.onUp = () => {
            this.down = false;
            if (this.state === 'idle')
                this.resetImg();
        };
        this.tick = (now) => {
            this.raf = requestAnimationFrame(this.tick);
            const t = now - this.phaseStart;
            let p;
            if (this.state === 'in') {
                p = t / LogoEgg.IN;
                if (p >= 1) {
                    this.state = 'live';
                    p = 1;
                }
            }
            else if (this.state === 'out') {
                p = 1 - t / LogoEgg.OUT;
                if (p <= 0)
                    return this.finish();
            }
            else {
                p = 1;
            }
            this.render(p, now);
        };
        this.logo = logo;
        this.img = img;
        img.draggable = false;
        logo.addEventListener('dragstart', (e) => e.preventDefault());
        logo.addEventListener('pointerdown', this.onDown);
        logo.addEventListener('pointermove', this.onMove);
        logo.addEventListener('pointerup', this.onUp);
        logo.addEventListener('pointercancel', this.onUp);
        logo.addEventListener('click', (e) => {
            if (this.suppressClick || this.state !== 'idle') {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (!this.suppressClick && this.state === 'live')
                    this.exit();
            }
            this.suppressClick = false;
        }, true);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.state !== 'idle')
            this.exit(); });
    }
    resetImg() {
        this.img.style.transform = '';
        this.img.style.opacity = '';
    }
    readHidden() {
        const w = this.img.naturalWidth, h = this.img.naturalHeight;
        if (!w || !h)
            return null;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const cx = c.getContext('2d', { willReadFrequently: true });
        if (!cx)
            return null;
        cx.drawImage(this.img, 0, 0);
        let data;
        try {
            data = cx.getImageData(0, 0, w, h).data;
        }
        catch (e) {
            return null;
        }
        let i = 0;
        const next = () => {
            while (i < data.length && data[i + 3] !== 255)
                i += 4;
            if (i >= data.length)
                throw new Error('eof');
            const bit = ((data[i] & 1) + (data[i + 1] & 1) + (data[i + 2] & 1)) >= 2 ? 1 : 0;
            i += 4;
            return bit;
        };
        const read = (width) => { let v = 0; for (let k = 0; k < width; k++)
            v = (v << 1) | next(); return v; };
        try {
            if (read(16) !== 0x5249)
                return null;
            const n = read(8);
            read(8);
            const sum = read(8);
            if (n < 21 || n > 57)
                return null;
            const bits = new Uint8Array(n * n);
            let total = 0;
            for (let k = 0; k < bits.length; k++)
                total += (bits[k] = next());
            return (total & 0xff) === sum ? { n, bits } : null;
        }
        catch (e) {
            return null;
        }
    }
    prepare() {
        const hidden = this.readHidden();
        if (!hidden)
            return false;
        this.n = hidden.n;
        this.bits = hidden.bits;
        const n = this.n, c = (n - 1) / 2, maxD = Math.hypot(c, c);
        this.order = new Float32Array(n * n).map((_, k) => Math.min(1, Math.hypot(k % n - c, Math.floor(k / n) - c) / maxD * 0.85 + Math.random() * 0.15));
        this.buildCloud();
        const t = document.createElement('canvas');
        t.width = this.img.naturalWidth;
        t.height = this.img.naturalHeight;
        const tc = t.getContext('2d');
        tc.drawImage(this.img, 0, 0);
        tc.globalCompositeOperation = 'source-in';
        tc.fillStyle = `rgb(${LogoEgg.CYAN})`;
        tc.fillRect(0, 0, t.width, t.height);
        this.tinted = t;
        return true;
    }
    buildCloud() {
        const n = this.n, bits = this.bits, order = this.order;
        const w = this.img.naturalWidth, h = this.img.naturalHeight;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const cx = c.getContext('2d', { willReadFrequently: true });
        cx.drawImage(this.img, 0, 0);
        const data = cx.getImageData(0, 0, w, h).data;
        const solid = [];
        for (let i = 0; i < w * h; i += 3)
            if (data[i * 4 + 3] > 200)
                solid.push(i);
        const tx = [], ty = [], delay = [], dust = [];
        const L = [0.2, 0.5, 0.8];
        for (let k = 0; k < n * n; k++) {
            const r = Math.floor(k / n), col = k % n;
            if (bits[k]) {
                for (const a of L)
                    for (const b of L) {
                        tx.push(col + a);
                        ty.push(r + b);
                        delay.push(order[k]);
                        dust.push(0);
                    }
            }
            else if (Math.random() < 0.3) {
                tx.push(col + 0.2 + Math.random() * 0.6);
                ty.push(r + 0.2 + Math.random() * 0.6);
                delay.push(order[k]);
                dust.push(1);
            }
        }
        const count = tx.length;
        const sx = new Float32Array(count), sy = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            const pix = solid.length ? solid[Math.floor(Math.random() * solid.length)] : Math.floor(Math.random() * w * h);
            sx[i] = (pix % w) / w;
            sy[i] = Math.floor(pix / w) / h;
        }
        this.pts = {
            tx: Float32Array.from(tx), ty: Float32Array.from(ty), sx, sy,
            ph: new Float32Array(count * 3).map(() => Math.random() * Math.PI * 2),
            delay: Float32Array.from(delay), dust: Uint8Array.from(dust),
            spark: new Uint8Array(count).map((_, i) => (!dust[i] && Math.random() < 0.04) ? 1 : 0),
            count
        };
    }
    enter() {
        if (!this.prepare())
            return;
        this.down = false;
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.className = 'logo-egg';
            this.canvas.setAttribute('role', 'img');
            this.canvas.setAttribute('aria-label', 'QR code: welcome.m4a');
            this.logo.appendChild(this.canvas);
        }
        const dpr = this.dpr = Math.min(3, window.devicePixelRatio || 1);
        this.W = this.img.getBoundingClientRect().width || 200;
        this.canvas.width = this.canvas.height = Math.round(this.W * dpr);
        this.ctx = this.canvas.getContext('2d');
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.logo.classList.add('egg-on');
        this.resetImg();
        this.state = this.reduced ? 'live' : 'in';
        this.phaseStart = performance.now();
        clearTimeout(this.autoExit);
        this.autoExit = window.setTimeout(() => this.exit(), 60000);
        cancelAnimationFrame(this.raf);
        this.raf = requestAnimationFrame(this.tick);
    }
    exit() {
        if (this.state === 'idle' || this.state === 'out')
            return;
        clearTimeout(this.autoExit);
        if (this.reduced)
            return this.finish();
        this.state = 'out';
        this.phaseStart = performance.now();
    }
    finish() {
        cancelAnimationFrame(this.raf);
        this.state = 'idle';
        this.logo.classList.remove('egg-on');
    }
    static seg(p, a, b) {
        return Math.min(1, Math.max(0, (p - a) / (b - a)));
    }
    static easeOut(x) {
        return 1 - (1 - x) ** 3;
    }
    render(p, now) {
        const ctx = this.ctx, W = this.W, n = this.n;
        const C = LogoEgg.CYAN, G = LogoEgg.GLOW;
        const dpr = this.dpr;
        const mod = Math.max(1, Math.floor(W * 0.8 * dpr / (n + 2 * LogoEgg.QUIET))) / dpr;
        const side = mod * (n + 2 * LogoEgg.QUIET);
        const x0 = Math.round((W - side) / 2 * dpr) / dpr, y0 = x0;
        const qx = x0 + LogoEgg.QUIET * mod, qy = y0 + LogoEgg.QUIET * mod;
        const cx = W / 2, cy = W / 2;
        ctx.clearRect(0, 0, W, W);
        const em = LogoEgg.seg(p, 0, 0.2);
        if (em < 1 && this.tinted) {
            const fade = 1 - em;
            const strips = 9;
            const sh = W / strips;
            for (let s = 0; s < strips; s++) {
                const jitter = (Math.random() - 0.5) * 14 * em;
                ctx.globalAlpha = fade * (0.55 + Math.random() * 0.45 * (1 - em));
                ctx.drawImage(this.img, 0, s * (this.img.naturalHeight / strips), this.img.naturalWidth, this.img.naturalHeight / strips, jitter, s * sh, W, sh);
                ctx.globalAlpha = fade * 0.6 * em;
                ctx.drawImage(this.tinted, 0, s * (this.tinted.height / strips), this.tinted.width, this.tinted.height / strips, jitter + 2, s * sh, W, sh);
            }
            ctx.globalAlpha = 1;
            const sy = em * W;
            const grad = ctx.createLinearGradient(0, sy - 18, 0, sy + 2);
            grad.addColorStop(0, `rgba(${G}, 0)`);
            grad.addColorStop(1, `rgba(${C}, ${0.8 * fade})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, sy - 18, W, 20);
        }
        const pan = LogoEgg.easeOut(LogoEgg.seg(p, 0.2, 0.45));
        if (pan > 0) {
            ctx.fillStyle = LogoEgg.PANEL;
            ctx.globalAlpha = pan;
            const h = side * pan;
            ctx.fillRect(x0, cy - h / 2, side, h);
            ctx.globalAlpha = 1;
            ctx.strokeStyle = `rgba(${C}, ${0.55 * pan})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - side / 2 * pan, y0 - 0.5);
            ctx.lineTo(cx + side / 2 * pan, y0 - 0.5);
            ctx.moveTo(cx - side / 2 * pan, y0 + side + 0.5);
            ctx.lineTo(cx + side / 2 * pan, y0 + side + 0.5);
            ctx.stroke();
        }
        const ring = LogoEgg.easeOut(LogoEgg.seg(p, 0.1, 0.55));
        if (ring > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, W, W);
            ctx.rect(x0 - 2, y0 - 2, side + 4, side + 4);
            ctx.clip('evenodd');
            const rot = now / 1000;
            ctx.shadowColor = `rgba(${G}, 0.9)`;
            ctx.shadowBlur = 6;
            const arc = (r, start, len, width, alpha) => {
                ctx.beginPath();
                ctx.arc(cx, cy, r, start, start + len * ring);
                ctx.lineWidth = width;
                ctx.strokeStyle = `rgba(${C}, ${alpha * ring})`;
                ctx.stroke();
            };
            const rT = W * 0.49;
            ctx.lineWidth = 1;
            ctx.strokeStyle = `rgba(${C}, ${0.55 * ring})`;
            ctx.beginPath();
            const ticks = 72;
            for (let k = 0; k < ticks * ring; k++) {
                const a = k / ticks * Math.PI * 2 - rot * 0.15;
                const len = k % 6 === 0 ? 6 : 3;
                ctx.moveTo(cx + Math.cos(a) * rT, cy + Math.sin(a) * rT);
                ctx.lineTo(cx + Math.cos(a) * (rT - len), cy + Math.sin(a) * (rT - len));
            }
            ctx.stroke();
            for (let k = 0; k < 3; k++)
                arc(W * 0.455, rot * 0.6 + k * Math.PI * 2 / 3, 1.3, 2, 0.85);
            for (let k = 0; k < 4; k++)
                arc(W * 0.425, -rot * 0.9 + k * Math.PI / 2, 0.7, 1, 0.6);
            arc(W * 0.47, rot * 0.25, Math.PI * 2, 0.6, 0.35);
            const sweepA = rot * 1.6;
            const sweep = ctx.createConicGradient ? ctx.createConicGradient(sweepA, cx, cy) : null;
            if (sweep) {
                sweep.addColorStop(0, `rgba(${G}, ${0.28 * ring})`);
                sweep.addColorStop(0.12, `rgba(${G}, 0)`);
                sweep.addColorStop(1, `rgba(${G}, 0)`);
                ctx.shadowBlur = 0;
                ctx.fillStyle = sweep;
                ctx.beginPath();
                ctx.arc(cx, cy, W * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 4;
            ctx.fillStyle = `rgba(${C}, ${0.9 * ring})`;
            ctx.font = `600 ${Math.max(7, W * 0.038).toFixed(1)}px Bender, "JetBrains Mono", monospace`;
            ctx.textBaseline = 'middle';
            const sync = Math.round(LogoEgg.seg(p, 0.35, 0.9) * 100);
            ctx.textAlign = 'left';
            ctx.fillText('R.I. // DECRYPT', x0, y0 / 2);
            ctx.textAlign = 'right';
            ctx.fillText(sync >= 100 ? 'LINK OK' : `SYNC ${sync}%`, x0 + side, y0 / 2);
            ctx.textAlign = 'left';
            ctx.fillText(`LSB ${n * n + 40}b`, x0, W - y0 / 2);
            ctx.textAlign = 'right';
            ctx.fillText((Math.floor(now / 160) % 2 ? '● ' : '○ ') + 'WELCOME.M4A', x0 + side, W - y0 / 2);
            ctx.restore();
        }
        const br = LogoEgg.easeOut(LogoEgg.seg(p, 0.3, 0.5));
        if (br > 0) {
            const off = (1 - br) * 14, L = mod * 3;
            ctx.strokeStyle = `rgba(${C}, ${br})`;
            ctx.lineWidth = 2;
            ctx.shadowColor = `rgba(${G}, 0.9)`;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
                const px = cx + sx * (side / 2 + 3 + off), py = cy + sy * (side / 2 + 3 + off);
                ctx.moveTo(px, py - sy * L);
                ctx.lineTo(px, py);
                ctx.lineTo(px - sx * L, py);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
        const P = this.pts;
        const appear = LogoEgg.seg(p, 0.04, 0.16);
        if (appear > 0) {
            const live = this.state === 'live';
            const tsec = now / 1000;
            const dot = mod * 0.36, dust = mod * 0.16;
            const { tx, ty, sx, sy, ph, delay } = P;
            const bits = this.bits, order = this.order;
            ctx.fillStyle = `rgb(${G})`;
            for (let k = 0; k < n * n; k++) {
                if (!bits[k])
                    continue;
                const start = 0.12 + order[k] * 0.32;
                const landed = LogoEgg.seg(p, start + 0.3, start + 0.45);
                if (landed <= 0)
                    continue;
                ctx.globalAlpha = 0.5 * landed;
                ctx.fillRect(qx + (k % n) * mod, qy + Math.floor(k / n) * mod, mod, mod);
            }
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = `rgb(${C})`;
            for (let i = 0; i < P.count; i++) {
                const start = 0.12 + delay[i] * 0.32;
                const f = LogoEgg.seg(p, start, start + 0.45);
                const e = f < 0.5 ? 4 * f * f * f : 1 - (-2 * f + 2) ** 3 / 2;
                const gx = qx + tx[i] * mod, gy = qy + ty[i] * mod;
                const ox = sx[i] * W, oy = sy[i] * W;
                const swirl = Math.sin(f * Math.PI) * W * 0.07;
                const a0 = ph[i * 3];
                let x = ox + (gx - ox) * e + Math.cos(a0) * swirl;
                let y = oy + (gy - oy) * e + Math.sin(a0) * swirl;
                const j1 = ph[i * 3 + 1], j2 = ph[i * 3 + 2];
                const amp = (P.dust[i] ? 0.35 : 0.09) * mod * e;
                x += Math.sin(tsec * 1.3 + j1) * amp + Math.sin(tsec * 2.9 + j2) * amp * 0.35;
                y += Math.cos(tsec * 1.1 + j2) * amp + Math.cos(tsec * 2.3 + j1) * amp * 0.35;
                if (P.spark[i] && live) {
                    const out = Math.max(0, Math.sin(tsec * 0.9 + j1 * 3)) ** 6 * mod * 1.6;
                    x += Math.cos(j2) * out;
                    y += Math.sin(j2) * out;
                }
                const wave = 1 + 0.22 * Math.sin(tsec * 2.2 - Math.hypot(tx[i] - n / 2, ty[i] - n / 2) * 0.45) * e;
                const twinkle = 0.78 + 0.22 * Math.sin(tsec * 3.1 + j1 * 5);
                if (P.dust[i]) {
                    ctx.globalAlpha = 0.16 * appear * twinkle;
                    ctx.fillRect(x - dust / 2, y - dust / 2, dust, dust);
                }
                else {
                    const sz = (dot + (1 - e) * mod * 0.1) * wave;
                    ctx.globalAlpha = appear * (0.55 + 0.3 * e) * twinkle;
                    ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
                }
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        }
    }
}
LogoEgg.CHANCE = 0.5;
LogoEgg.CYAN = '127, 232, 255';
LogoEgg.GLOW = '34, 187, 255';
LogoEgg.PANEL = 'rgba(4, 14, 22, 0.94)';
LogoEgg.QUIET = 2;
LogoEgg.IN = 2000;
LogoEgg.OUT = 900;
;
(() => {
    const logo = document.getElementById('logo');
    const img = logo ? logo.querySelector('img') : null;
    if (logo && img && logo.dataset.egg !== undefined)
        new LogoEgg(logo, img);
})();
