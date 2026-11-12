// Keep these defaults in sync with `settings` in content.js.
const defaults = { disabled: false, style: "vertical_bands", wildcard: "busy" }

window.onload = async () => {
    const settings = await chrome.storage.local.get(defaults)

    const toggle = document.getElementById("toggle_enabled")
    const style = document.getElementById("select_style")
    const wildcard = document.getElementById("wildcard_value")

    document.getElementById("version").textContent = `V${chrome.runtime.getManifest().version}`
    toggle.checked = !settings.disabled
    style.value = settings.style
    wildcard.value = settings.wildcard

    toggle.onchange = () => {
        const disabled = !toggle.checked
        chrome.storage.local.set({ disabled })
        chrome.action.setIcon({ path: disabled ? "icon-disabled.png" : "icon.png" })
    }

    style.onchange = () => chrome.storage.local.set({ style: style.value })

    wildcard.onchange = () => {
        const value = wildcard.value
        if (value.length < 3 && value !== "") {
            return alert("wildcard too short, you are going to get problems. If you do not want wildcard matching make this textbox blank")
        }
        chrome.storage.local.set({ wildcard: value })
    }
}
