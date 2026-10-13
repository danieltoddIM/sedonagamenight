// ------------------------------------------------------------
// Edit this file to change defaults, location, and wording.
// Game night dates themselves are added on the /admin page.
// ------------------------------------------------------------

export const site = {
  name: "Sedona Game Night",
  tagline: "Bringing Sedona together, one game night at a time.",
  description:
    "Come play, share some laughs, and get to know your neighbors. A free, welcoming game night for a more connected Sedona.",
};

// Defaults used when you add a new night on /admin
export const defaults = {
  // Suggested date: which week of the month (1-4, or -1 for last) and day (0 = Sun ... 4 = Thu ... 6 = Sat)
  weekOfMonth: 3,
  dayOfWeek: 4,
  start24: "18:30",
  end24: "21:00",
  capacity: 25,
  timeZone: "America/Phoenix", // Arizona does not observe daylight saving time
  utcOffsetHours: 7, // Phoenix is always UTC-7
};

export const waitlist = {
  // How long someone has to claim an open spot
  offerHours: 24,
  // If the night is sooner than this, give them until this many hours before start instead
  stopOffersHoursBefore: 3,
  // Preserve the original family-friendly soft cap. Set false for a strict venue limit.
  allowFamilyOverflow: true,
};

export const pizza = {
  options: ["Cheese", "Pepperoni", "Sausage", "Veggie", "Meat lovers", "Hawaiian"],
  slicesPerAdult: 3,
  slicesPerKid: 2,
  slicesPerLarge: 8,
  // Gluten-free pizzas are usually a small (about 6 slices)
  slicesPerGlutenFree: 6,
};

export const location = {
  name: "Rock of Ages Church",
  addressConfirmed: false, // Set true after confirming the full street address

  address: "Sedona, Arizona", // Replace with verified street address before launch
  room: "", // Set only after the venue confirms the room
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Rock+of+Ages+Church+Sedona+AZ",
};

export const hosts = ["Summit Life Church", "Rock of Ages Church"];

export const churchOptions = [
  "Summit Life Church",
  "Rock of Ages Church",
  "Another church",
  "Just visiting / no church home",
];

export const gameCategories = [
  "Strategy",
  "Family",
  "Party",
  "Card",
  "Cooperative",
  "Word",
  "Classic",
];

// Shown next to the text-message checkbox on the RSVP form.
export const smsConsentText =
  "Text me my RSVP confirmation, waitlist updates, Sedona Game Night reminders, and new game night invitations. Msg frequency varies, about 2 to 4 per month. Msg & data rates may apply. Reply STOP to opt out, HELP for help.";
