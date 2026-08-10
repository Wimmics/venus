export function isValidCssColor(value) {
    if (typeof value !== "string") return false;

    const style = new Option().style;
    style.color = "";
    style.color = value;

    return style.color !== "";
}