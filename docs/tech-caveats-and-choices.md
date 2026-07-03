## Tailwind

We cannot use Tailwind CSS v4 because it is not compatible with older devices (Android 6, macOS 12, etc).

For example, the `md:hidden` class on v4 is compiled to 
```css
.md\:hidden {
  @media (width >= 768px) {
    display: none;
  }
}
```

This uses Media Queries v4 syntax (media query ranges) as well as Native CSS Nesting. These are very new features.

Both of these are not supported by older devices. And this project cares about supporting older devices.