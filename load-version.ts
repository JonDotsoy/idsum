import versionRaw from "./version.txt"

export const version = () => `${versionRaw.trim()}`
export const getProcessor = () => process.env.HOMEBREW_PROCESSOR ?? null
