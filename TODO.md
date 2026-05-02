# Task: Remove availability on the home

## Steps

1. Remove booking widget section from Home.jsx
2. Remove "Ready to choose dates?" card from Quick Tour Modal in Home.jsx
3. Update "Book Your Sanctuary" button in hero section to navigate to accommodations page
4. (Optional) Update navbar "Book Now" button to link to accommodations (if needed)

## Details

### Step 1: Remove booking widget section
- Locate `<section id="booking">` and remove entire section (including closing `</section>`).
- Ensure no leftover empty lines cause layout issues.

### Step 2: Remove card from Quick Tour Modal
- Locate the card with "Ready to choose dates?" inside the `lg:col-span-2` div.
- Remove the entire card div (including image and button).
- Keep the surrounding `lg:col-span-2` div and the button below.

### Step 3: Update hero button
- Change `onClick={() => scrollToId('booking')}` to navigate to `/accommodations` using `window.location.href` or `useNavigate` (but component is not using router). Simpler: change to `window.location.href = '/accommodations'` or use `Link`? Since it's a button, we'll change to an `<a>` tag or keep button with `window.location.href`. We'll decide.

### Step 4: Update navbar button (optional)
- If we decide to update, change the navbar's "Book Now" button to link to accommodations.

## Progress
- [x] Step 1
- [x] Step 2
- [x] Step 3
- [ ] Step 4 (optional)
