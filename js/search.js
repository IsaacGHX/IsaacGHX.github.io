(() => {
  'use strict'
  const cfg = config.search
  const input = document.getElementById('search-input')
  const nav = document.querySelector('nav')
  const popup = document.querySelector('.search-popup')
  if (!cfg || !input || !nav || !popup) return

  const MAX_RESULTS = 30
  const SNIPPET_BEFORE = 20
  const SNIPPET_AFTER = 80
  const state = { docs: null, loading: null, failed: false }

  const escapeHTML = (s) => s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c])

  // Decode entities left in the index by stripHTML, without executing anything.
  const decoder = document.createElement('textarea')
  const toText = (s) => {
    decoder.innerHTML = String(s || '').replace(/<[^>]+>/g, ' ')
    return decoder.value.replace(/\s+/g, ' ').trim()
  }

  /** Fetch and normalise the index once; failures can be retried. */
  function load() {
    if (state.docs) return Promise.resolve(state.docs)
    if (state.loading) return state.loading
    state.failed = false
    state.loading = fetch(cfg.path, { credentials: 'same-origin' })
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
      })
      .then((data) => {
        state.docs = (Array.isArray(data) ? data : [])
          .filter((d) => d && d.title && d.url)
          .map((d) => {
            const title = toText(d.title)
            const content = toText(d.content)
            return {
              title, content,
              titleLower: title.toLowerCase(),
              contentLower: content.toLowerCase(),
              url: d.url.replace(/\/{2,}/g, '/')
            }
          })
        return state.docs
      })
      .catch((err) => {
        state.failed = true
        throw err
      })
      .finally(() => { state.loading = null })
    return state.loading
  }

  /** All [start, end) ranges where any keyword occurs, merged and sorted. */
  function findHits(textLower, keywords) {
    const hits = []
    for (const word of keywords) {
      let from = 0, at
      while ((at = textLower.indexOf(word, from)) > -1) {
        hits.push([at, at + word.length])
        from = at + word.length
      }
    }
    hits.sort((a, b) => a[0] - b[0] || b[1] - a[1])
    const merged = []
    for (const hit of hits) {
      const last = merged[merged.length - 1]
      if (last && hit[0] <= last[1]) last[1] = Math.max(last[1], hit[1])
      else merged.push(hit.slice())
    }
    return merged
  }

  function highlight(text, hits, start, end) {
    let out = '', pos = start
    for (const [a, b] of hits) {
      if (b <= start || a >= end) continue
      const s = Math.max(a, start), e = Math.min(b, end)
      out += escapeHTML(text.slice(pos, s)) + '<mark class="search-keyword">' + escapeHTML(text.slice(s, e)) + '</mark>'
      pos = e
    }
    return out + escapeHTML(text.slice(pos, end))
  }

  function search(query) {
    const phrase = query.toLowerCase()
    const keywords = [...new Set(phrase.split(/[-\s]+/).filter(Boolean))]
    if (keywords.length > 1) keywords.push(phrase)
    const results = []
    state.docs.forEach((doc, order) => {
      const titleHits = findHits(doc.titleLower, keywords)
      const contentHits = findHits(doc.contentLower, keywords)
      if (!titleHits.length && !contentHits.length) return
      let matched = 0, inTitle = 0
      for (const word of keywords) {
        const t = doc.titleLower.includes(word)
        if (t || doc.contentLower.includes(word)) matched++
        if (t) inTitle++
      }
      let snippet
      if (contentHits.length) {
        const first = contentHits[0][0]
        const start = Math.max(0, first - SNIPPET_BEFORE)
        const end = Math.min(doc.content.length, Math.max(first + SNIPPET_AFTER, contentHits[0][1]))
        snippet = (start > 0 ? '…' : '') + highlight(doc.content, contentHits, start, end) + '…'
      } else {
        snippet = escapeHTML(doc.content.slice(0, SNIPPET_AFTER)) + '…'
      }
      results.push({
        matched, inTitle, hits: titleHits.length + contentHits.length, order,
        html: `<a href="${escapeHTML(doc.url)}" class="recent-post"><b class="search-result-title">` +
          highlight(doc.title, titleHits, 0, doc.title.length) +
          `</b><p class="search-result">${snippet}</p></a>`
      })
    })
    results.sort((a, b) => b.matched - a.matched || b.inTitle - a.inTitle || b.hits - a.hits || a.order - b.order)
    return results.slice(0, MAX_RESULTS)
  }

  /* ---------- rendering ---------- */

  const resultBox = () => {
    let box = document.getElementById('search-result')
    if (!box) {
      popup.innerHTML = '<div id="search-result"></div>'
      box = document.getElementById('search-result')
    }
    return box
  }

  function openPopup() {
    document.body.classList.add('blur')
    if (document.querySelector('.up') && document.querySelector('.closed')) {
      document.querySelector('.navBtn')?.classList.add('expanded')
    }
    popup.classList.add('open')
  }

  function closePopup() {
    if (document.querySelector('.up') && document.querySelector('.closed')) {
      document.querySelector('.navBtn')?.classList.remove('expanded')
    }
    resultBox().querySelectorAll('a').forEach((a) => a.setAttribute('tabindex', '-1'))
    document.body.classList.remove('blur')
    popup.classList.remove('open')
  }

  function render() {
    const query = input.value.trim()
    if (!query) {
      input.placeholder = cfg.activeHolder
      closePopup()
      return
    }
    openPopup()
    const box = resultBox()
    if (!state.docs) {
      if (state.failed) {
        // Shown until the next keystroke / focus, which retries the download.
        box.innerHTML = `<div id="no-result"><p>${escapeHTML(cfg.loadFail)}</p></div>`
      } else {
        box.innerHTML = '<div id="loading"><div><p>Loading...</p></div></div>'
        load().then(render, render)
      }
      return
    }
    const results = search(query)
    popup.scroll({ top: 0, left: 0 })
    box.innerHTML = results.length
      ? results.map((r) => r.html).join('')
      : `<div id="no-result"><p>${format(escapeHTML(cfg.noResult), `<b>${escapeHTML(query)}</b>`)}</p></div>`
    if (window.pjax && typeof window.pjax.refresh === 'function') window.pjax.refresh(box)
  }

  // Coalesce keystrokes into one search per frame.
  let queued = false
  const scheduleRender = () => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => { queued = false; render() })
  }

  /* ---------- open / close ---------- */

  let moveTimer = 0
  const moving = () => {
    nav.classList.add('search-moving')
    clearTimeout(moveTimer)
    moveTimer = setTimeout(() => nav.classList.remove('search-moving'), 600)
  }

  function startSearch() {
    nav.classList.add('search')
    moving()
    if (typeof header !== 'undefined') header.closeAll()
    if (document.querySelector('.up')) document.querySelector('main').style.pointerEvents = 'none'
    input.placeholder = cfg.activeHolder
    if (state.failed) state.failed = false
    load().catch(() => {})
  }

  function escapeSearch() {
    if (!nav.classList.contains('search')) return
    nav.classList.remove('search')
    moving()
    closePopup()
    input.value = ''
    input.placeholder = cfg.blurHolder
    document.querySelector('main').style.pointerEvents = ''
    input.blur()
  }

  const insideResults = (el) => !!el && !!el.closest && !!el.closest('.search-popup')

  input.addEventListener('focus', startSearch)
  input.addEventListener('input', (e) => {
    if (e.isComposing) return // wait for IME composition (Chinese / Japanese input) to finish
    nav.classList.add('search')
    state.failed = false
    scheduleRender()
  })
  input.addEventListener('compositionend', scheduleRender)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault()
      render()
      const first = resultBox().querySelector('a')
      if (first) first.focus()
    }
  })
  input.addEventListener('blur', (e) => {
    if (!insideResults(e.relatedTarget)) escapeSearch()
  })
  popup.addEventListener('focusout', (e) => {
    if (e.relatedTarget !== input && !insideResults(e.relatedTarget)) escapeSearch()
  })
  document.addEventListener('keyup', (e) => {
    if (e.key === 'Escape') {
      escapeSearch()
    } else if (e.key === 'f' && !isTypingOrModified(e)) {
      if (!document.querySelector('.up') && typeof header !== 'undefined') header.open()
      startSearch()
      input.focus()
    }
  })
  document.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('a')) escapeSearch()
  })

  if (cfg.preload) load().catch(() => {})
})()
