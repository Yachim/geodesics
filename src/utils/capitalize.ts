export function capitalizeFirstLetter(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

export function capitalize(text: string) {
    return text.split(" ").map(capitalizeFirstLetter).join(" ")
}