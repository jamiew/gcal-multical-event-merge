import { readFileSync } from "node:fs"
import vm from "node:vm"
import { JSDOM } from "jsdom"

const source = file => readFileSync(new URL(`../${file}`, import.meta.url), "utf8")

// Loads content.js into a fake page. With `disabled: true` nothing runs on its own,
// so tests can call merge() directly. Returns the window and a way to read globals.
export const loadPage = (html = "", { disabled = true } = {}) => {
    const dom = new JSDOM(`<body>${html}</body>`, { runScripts: "outside-only", pretendToBeVisual: true })
    dom.window.chrome = {
        storage: {
            local: { get: async defaults => ({ ...defaults, disabled }) },
            onChanged: { addListener: () => {} }
        }
    }
    const context = dom.getInternalVMContext()
    vm.runInContext(source("chroma.min.js"), context)
    vm.runInContext(source("content.js"), context)
    return { window: dom.window, document: dom.window.document, get: name => vm.runInContext(name, context) }
}

// Builders that copy the structure of Google Calendar's real markup (Nov 2026),
// with made-up titles and ids.

// One event in month view or the week view all-day section.
export const chip = ({ id, title, color = "rgb(118, 52, 108)", top }) => `
    <div data-eventid="${id}" data-eventchip="" class="vEJ0bc" style="left: 0%; width: 14.29%; top: ${top}em; border-color: ${color};">
        <div role="button" class="KF4T6b">
            <div class="ZWOtn"><div class="VlNR9e" style="border-color: ${color};"></div></div>
            <span aria-hidden="true" class="nHqeVd"><span>9am</span><span>${title}</span></span>
            <span class="XuJrye">9am to 10am, ${title}</span>
        </div>
    </div>`

// The "3 more" link at the bottom of a full day.
export const moreLink = ({ count, top }) => `
    <div role="presentation" class="vEJ0bc KCIIIb" style="left: 0%; width: 14.29%; top: ${top}em;">
        <div role="button" class="KF4T6b KCIIIb">${count} more</div>
    </div>`

export const day = chips => `<div role="gridcell"><h2>events</h2><div role="presentation">${chips.join("")}</div></div>`

// One week row of month view.
export const monthWeek = days => `
    <div role="main"><div role="grid"><div role="row">
        <div role="presentation" style="height: 6em;">${days.join("")}</div>
    </div></div></div>`

// The all-day section at the top of week view. Google sizes it by row count.
export const weekAllDay = (days, height) => `
    <div role="main"><div role="row" style="max-height: 3em;">
        <div role="presentation" style="height: ${height}em;">${days.join("")}</div>
    </div></div>`

// The `top` of each event row in a day, in DOM order, e.g. { a: "0em", b: "1em" }.
export const tops = (document, dayIndex) => {
    const cell = document.querySelectorAll('[role="gridcell"]')[dayIndex]
    return Object.fromEntries(Array.from(cell.querySelectorAll(':scope > [role="presentation"] > *'), row => [row.dataset.eventid ?? "more", row.style.top]))
}
