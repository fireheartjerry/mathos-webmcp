// What the page looks like to a visitor whose OS is set to dark.
const root = getComputedStyle(document.documentElement)
const body = getComputedStyle(document.body)
return {
  colorScheme: root.colorScheme,
  prefersDark: matchMedia('(prefers-color-scheme: dark)').matches,
  bodyBackground: body.backgroundColor,
  bodyColor: body.color,
  headlineColor: getComputedStyle(document.querySelector('h1') || document.body).color,
}
