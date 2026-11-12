// Paste into the DevTools console on calendar.google.com. Copies the calendar's
// structure (tags, roles, classes, inline styles, short text) to the clipboard.
;(() => {
    const keep = ["role", "data-eventid", "data-eventchip", "aria-hidden", "class", "style", "jsname"]
    const dump = (el, depth) => {
        if (["svg", "path", "script", "style"].includes(el.tagName.toLowerCase())) return ""
        const attrs = keep.filter(n => el.hasAttribute(n)).map(n => `${n}="${el.getAttribute(n).slice(0, 200)}"`)
        const text = [...el.childNodes]
            .filter(n => n.nodeType === 3)
            .map(n => n.textContent.trim())
            .join(" ")
            .slice(0, 40)
        const line = `${"  ".repeat(depth)}<${[el.tagName.toLowerCase(), ...attrs].join(" ")}>${text ? ` ${text}` : ""}\n`
        return line + [...el.children].map(c => dump(c, depth + 1)).join("")
    }
    copy(dump(document.querySelector('[role="main"]'), 0))
    console.log("Copied calendar structure to clipboard")
})()
