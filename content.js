// Defaults match the popup, so merging works before the popup is ever opened.
const settings = { disabled: false, style: "vertical_bands", wildcard: "busy" }

// Each event's color, from whichever style property Google set for that view.
const mainColor = c => c.bg || c.bc || c.pbc

const fillOptions = {
    candy_cane: colorObjs => {
        const width = 10
        const colors = colorObjs.map(mainColor)
        const remaining = {}
        for (const color of colors) remaining[color] = (remaining[color] || 0) + 1

        // Repeats of the same color get darker, so each event is still visible.
        const stops = colors.map((color, i) => {
            remaining[color] -= 1
            const shade = chroma(color)
                .darken(remaining[color] / 3)
                .css()
            return `${shade} ${i * width}px, ${shade} ${(i + 1) * width}px`
        })
        return `repeating-linear-gradient(45deg, ${stops.join(", ")})`
    },
    vertical_bands: colorObjs => {
        const width = 100 / colorObjs.length
        const stops = colorObjs.map((c, i) => {
            const start = i * width
            const end = start + width
            if (c.bg || !c.bc) return `${mainColor(c)} 0% ${end}%`
            // Border-only events (not attending) get zebra stripes to look like an outline.
            const brighter = chroma(c.bc).brighten().css()
            const fifth = width / 5
            return [c.bc, brighter, c.bc, brighter, c.bc].map((color, j) => `${color} 0% ${j === 4 ? end : start + (j + 1) * fifth}%`).join(", ")
        })
        return `linear-gradient(90deg, ${stops.join(", ")})`
    },
    smooth_vertical_bands: colorObjs => `linear-gradient(to right, ${colorObjs.map(mainColor).join(", ")})`,
    // Each color is listed three times so it spreads wider before fading.
    vertical_bands_fade_merge: colorObjs =>
        `linear-gradient(to right, ${colorObjs
            .map(mainColor)
            .flatMap(color => [color, color, color])
            .join(", ")})`
}

const fillFor = colors => (fillOptions[settings.style] || fillOptions.vertical_bands)(colors)

// Events with the same key on the same day get merged.
const eventKey = (dayIndex, title, height) => `${dayIndex}_${title.replace(/\s+/g, "")}${height}`

const escapeRegExp = string => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// Turns a key into a pattern where the first wildcard word matches anything, e.g. "0_Busy" -> /^0_.*$/.
// Returns null when the key has no wildcard word in it.
const wildcardPattern = (key, wildcard) => {
    const words = wildcard
        .replace(/^\/|\/$/g, "")
        .split("|")
        .filter(Boolean)
    const escaped = escapeRegExp(key)
    for (const word of words) {
        const replaced = escaped.replace(new RegExp(escapeRegExp(word), "i"), ".*")
        if (replaced !== escaped) return new RegExp(`^${replaced}$`, "i")
    }
    return null
}

// Finds an existing key that `key` should merge into, e.g. "Busy" and "Team sync" on the same day.
// Works whichever of the two events contains the wildcard word.
const findMatchingKey = (keys, key, wildcard) => {
    if (!wildcard) return null
    const pattern = wildcardPattern(key, wildcard)
    return keys.find(existing => pattern?.test(existing) || wildcardPattern(existing, wildcard)?.test(key)) ?? null
}

const calculatePosition = (event, parentPosition) => {
    const eventPosition = event.getBoundingClientRect()
    return {
        left: Math.max(eventPosition.left - parentPosition.left, 0),
        right: parentPosition.right - eventPosition.right,
        parentWidth: parentPosition.width
    }
}

const mergeEventElements = events => {
    const colors = events.map(event => ({
        bg: event.style.backgroundColor, // Week day and full day events marked 'attending'
        bc: event.style.borderColor, // Not attending or not responded week view events
        pbc: event.parentElement.style.borderColor // Timed month view events
    }))

    const parentPosition = events[0].parentElement.getBoundingClientRect()
    const positions = events.map(event => {
        event.originalPosition = event.originalPosition || calculatePosition(event, parentPosition)
        return event.originalPosition
    })

    // Find the space the original events took up, so the hidden copies can sit
    // side by side under the matching color band and stay clickable.
    const leftMost = Math.min(...positions.map(p => p.left))
    const rightMost = Math.min(...positions.map(p => p.right))
    const parentWidth = positions[0].parentWidth
    const leftPercent = (leftMost / parentWidth) * 100
    const widthPercent = ((parentWidth - leftMost - rightMost) / parentWidth) * 100

    const [eventToKeep, ...hidden] = events

    hidden.forEach((event, i) => {
        event.style.opacity = 0
        event.style.left = `calc(${leftPercent}% + ${widthPercent}% * ${(i + 1) / (hidden.length + 1)})`
        event.style.width = `calc(${widthPercent}% * ${1 / (hidden.length + 1)})`
        // All-day events use flex layout, so pin them in place instead.
        if (!event.style.height) {
            event.style.position = "absolute"
            event.style.top = 0
        }
    })

    if (eventToKeep.style.backgroundColor || eventToKeep.style.borderColor) {
        eventToKeep.originalStyle = eventToKeep.originalStyle || {
            backgroundImage: eventToKeep.style.backgroundImage,
            backgroundSize: eventToKeep.style.backgroundSize,
            left: eventToKeep.style.left,
            right: eventToKeep.style.right,
            width: eventToKeep.style.width,
            border: eventToKeep.style.border,
            borderColor: eventToKeep.style.borderColor,
            textShadow: eventToKeep.style.textShadow
        }
        eventToKeep.style.backgroundImage = fillFor(colors)
        eventToKeep.style.backgroundSize = "initial"
        eventToKeep.style.left = `${leftMost}px`
        eventToKeep.style.right = `${rightMost}px`
        eventToKeep.style.width = null
        // Outline-only events have colored text, so switch to white on the new fill.
        if (!colors[0].bg) eventToKeep.style.color = "#fff"

        // Clear the faded text color Google sets on declined events.
        const title = eventToKeep.querySelector('[aria-hidden="true"]')
        if (title) title.style.color = null

        const span = eventToKeep.querySelector("span")
        if (span) {
            const isWhiteText = window.getComputedStyle(span).color === "rgb(255, 255, 255)"
            eventToKeep.style.textShadow = `0px 0px 2px ${isWhiteText ? "black" : "white"}`
        }
    } else {
        // Month view events without a fill only show a small colored dot.
        const dot = eventToKeep.querySelector('[role="button"] div:first-child')?.querySelector("div")
        if (dot) {
            dot.style.backgroundImage = fillFor(colors)
            dot.style.width = `${colors.length * 4}px`
            dot.style.borderWidth = 0
            dot.style.height = "8px"
        }
    }
}

const resetMergedEvents = events => {
    for (const event of events) Object.assign(event.style, event.originalStyle)
}

// Month view and the week view all-day section stack events in rows with `top: Nem`.
const ems = value => {
    const match = /^(-?[\d.]+)em$/.exec(value)
    return match ? Number(match[1]) : null
}
const emTop = el => ems(el.style.top)

// Removes the empty rows left by hidden duplicates. `hiddenToKept` maps each hidden
// duplicate's row element to the row element of the event it merged into.
const compactRows = (calendar, hiddenToKept) => {
    const layers = new Set(Array.from(calendar.querySelectorAll('[role="gridcell"]'), cell => cell.parentElement))
    for (const layer of layers) {
        const days = Array.from(layer.querySelectorAll(':scope > [role="gridcell"]'), cell =>
            Array.from(cell.querySelectorAll(':scope > [role="presentation"] > *')).filter(row => emTop(row) !== null)
        )

        // Multi-day events show up in every day they cover and must stay in the same row
        // across the week, so leave them where Google put them and fill in around them.
        const dayCount = new Map()
        for (const rows of days) {
            for (const id of new Set(rows.map(row => row.dataset.eventid).filter(Boolean))) dayCount.set(id, (dayCount.get(id) ?? 0) + 1)
        }
        const isMultiDay = row => dayCount.get(row.dataset.eventid) > 1

        let rowsUsed = 0
        for (const rows of days) {
            const fixed = new Set(rows.filter(isMultiDay).map(emTop))
            let next = 0
            for (const row of rows) {
                if (isMultiDay(row)) continue
                const kept = hiddenToKept.get(row)
                if (kept) {
                    // Sit under the merged event so each calendar's band stays clickable.
                    row.style.top = kept.style.top
                    continue
                }
                while (fixed.has(next)) next++
                row.style.top = `${next}em`
                next++
            }
            rowsUsed = Math.max(rowsUsed, next, ...[...fixed].map(top => top + 1))
        }

        // The week view all-day section is sized by Google's row count, so shrink it to fit.
        if (layer.closest('[role="row"]')?.style.maxHeight && ems(layer.style.height) > rowsUsed) {
            layer.style.height = `${Math.max(rowsUsed, 1)}em`
        }
    }
}

const merge = calendar => {
    const eventSets = new Map()
    calendar.querySelectorAll('[role="gridcell"]').forEach((day, dayIndex) => {
        day.querySelectorAll('[data-eventid][role="button"], [data-eventid] [role="button"]').forEach(event => {
            const titleEls = event.querySelectorAll('[aria-hidden="true"]')
            if (!titleEls.length) return
            const title = Array.from(titleEls, el => el.textContent).join("")
            const key = eventKey(dayIndex, title, event.style.height)
            const setKey = findMatchingKey([...eventSets.keys()], key, settings.wildcard) ?? key
            if (!eventSets.has(setKey)) eventSets.set(setKey, [])
            eventSets.get(setKey).push(event)
        })
    })

    const hiddenToKept = new Map()
    for (const events of eventSets.values()) {
        if (events.length > 1) {
            const kept = events[0].closest("[data-eventid]")
            for (const event of events.slice(1)) hiddenToKept.set(event.closest("[data-eventid]"), kept)
            mergeEventElements(events)
        } else {
            resetMergedEvents(events)
        }
    }
    compactRows(calendar, hiddenToKept)
}

// Google re-renders parts of the calendar all the time (resizing, navigating, popups),
// so re-merge after any change. The observer is paused while merging so our own
// style changes don't trigger another round.
const observer = new MutationObserver(() => scheduleMerge())
const observe = () => observer.observe(document.body, { childList: true, subtree: true, attributes: true })
let mergeScheduled = false

const scheduleMerge = () => {
    if (mergeScheduled) return
    mergeScheduled = true
    requestAnimationFrame(() => {
        mergeScheduled = false
        observer.disconnect()
        document.querySelectorAll('[role="main"], [role="dialog"]').forEach(merge)
        observe()
    })
}

chrome.storage.local.get(settings).then(stored => {
    Object.assign(settings, stored)
    console.log(`Cal merge is ${settings.disabled ? "disabled" : "enabled"}`)
    if (!settings.disabled) {
        observe()
        scheduleMerge()
    }

    // Any settings change reloads the page, so settings stay fixed while it runs.
    chrome.storage.onChanged.addListener(() => window.location.reload())
})
