/* ===================== SETTINGS — edit these ===================== */
const CONFIG = {
  phone: '96176075724',          // WhatsApp number: country code + number, digits only
  phoneDisplay: '76 075 724',    // how the number is shown on the page
  // Opening hours, day off and open-anyway dates: these until the sheet loads; then the Settings tab of the sheet
  // ("Opening hours", "Closed day", "Open anyway on"), which the shop changes there or in the app (Menu tab)
  closedDay: 1,                  // day off (Beirut time): 0=Sun 1=Mon 2=Tue ... 6=Sat, or null for none
  openDates: ['2026-10-19'],     // open anyway on these dates (Beirut time, YYYY-MM-DD), e.g. a test day
  hours: [['13:00', '16:00'], ['18:00', '24:00']], // opening hours each open day (Beirut time); past 24:00 = after midnight
  dayHours: {5: [['13:00', '16:00'], ['18:00', '24:30']], 6: [['13:00', '16:00'], ['18:00', '24:30']], 0: [['13:00', '16:00'], ['18:00', '24:30']]}, // other hours on some days (Fri, Sat, Sun)
  shownHours: [['13:00', '16:00'], ['18:00', '23:00']], // the hours written on the page for customers, every open day; the later closing above is for the staff
  timeZone: 'Asia/Beirut',
  // The whole menu comes from the Menu tab of the El Bash – Orders & Sales sheet, through the order screen's Apps Script
  menuUrl: 'https://script.google.com/macros/s/AKfycby7dthEIW4d2EF90fH6-_lGJEK_kAtu0XVSdARQUmM8w4iFEvBIfab-6SR9JdZmWDSdcA/exec?format=menu',
  // Orders go into the shop's app through the same script, then on WhatsApp as always (empty = WhatsApp only)
  orderUrl: 'https://script.google.com/macros/s/AKfycby7dthEIW4d2EF90fH6-_lGJEK_kAtu0XVSdARQUmM8w4iFEvBIfab-6SR9JdZmWDSdcA/exec',
  deliveryNote: {en: '', ar: ''},// optional line in the cart, e.g. {en: 'Delivery fee: 100,000 L.L.', ar: 'كلفة التوصيل: 100,000 ل.ل.'}
  photos: {                      // item photos (square, in the photos folder)
    'Fajita Sandwich': 'photos/fajita-sandwich.jpg',
    'Francisco Sandwich': 'photos/francisco-sandwich.jpg',
    'Chicken Quesadilla': 'photos/chicken-quesadilla.jpg',
    'Tawouk Sandwich': 'photos/tawouk-sandwich.jpg',
    'Zinger Sandwich': 'photos/zinger-sandwich.jpg',
    'Crunchy Burger': 'photos/crunchy-burger.jpg',
    'Escalope Meal 3 PCS': 'photos/escalope-meal.jpg',
    'Basha Burger': 'photos/basha-burger.jpg',
    'Broasted Family Meal 10 PCS': 'photos/broasted-family-meal.jpg',
    'Crispy Meal': 'photos/crispy-meal.jpg',
    'Mozzarella Patty Burger': 'photos/mozzarella-patty-burger.jpg',
    'Small Fries Box': 'photos/small-fries-box.jpg',
    'Large Fries Box with Sauce & Cheddar': 'photos/large-cheddar-fries.jpg',
    'Loaded Fries': 'photos/loaded-fries.jpg',
    'Mozzarella Sticks 6 PCS': 'photos/mozzarella-sticks.jpg',
    'Zinger Meal': 'photos/zinger-meal.jpg',
    'Shawarma Plate': 'photos/shawarma-plate.jpg',
    'Shawarma Meal': 'photos/shawarma-meal.jpg',
    'Small Fries Box with Sauce & Cheddar': 'photos/small-cheddar-fries.jpg',
    'Mushroom Burger': 'photos/mushroom-burger.jpg',
    'Wings Meal': 'photos/wings-meal.jpg',
    'Half Broasted Meal 5 PCS': 'photos/half-broasted-meal.jpg',
    'Nuggets 5 PCS': 'photos/nuggets.jpg',
    'Mix Appetizer Box': 'photos/mix-appetizer-box.jpg',
    'Cordon Bleu Sandwich': 'photos/cordon-bleu-sandwich.jpg',
    'Chicken Sub Sandwich': 'photos/chicken-sub-sandwich.jpg',
    'Buffalo Sauce': 'photos/buffalo-sauce.jpg',
    'Honey Mustard Sauce': 'photos/honey-mustard-sauce.jpg',
    'Barbecue Sauce': 'photos/barbecue-sauce.jpg',
    'Cocktail Sauce': 'photos/cocktail-sauce.jpg',
    'Garlic Sauce': 'photos/garlic-sauce.jpg',
    'Cheddar Cup (Small)': 'photos/cheddar-cup-small.jpg',
    'Coleslaw': 'photos/coleslaw.jpg'
  },
  cartHours: 24,                 // a saved cart is kept for this many hours
  usdRate: 89500                 // L.L. per $1, used for items priced in $ (e.g. '$15')
};

/* Sauces offered in the choice popup.
   type 's' = any number of SAUCES.fries · 's1' = 1 of SAUCES.wings · 's2' = 1 or 2 of SAUCES.wings · 'p' = pick number of pieces
   · 'o' = pick a size (then its sauces, if it has any) */
const SAUCES = {
  fries: ['Cocktail Sauce', 'Ketchup', 'Barbecue Sauce', 'Cheddar Sauce'],
  wings: ['Buffalo Sauce', 'Barbecue Sauce', 'Honey Mustard Sauce']
};

/* ===================== MENU =====================
   Everything about an item is its row in the Menu tab of the El Bash – Orders & Sales sheet: name, Arabic name, price,
   on the order screen, sold out, Description and Description (Arabic), Sauces (fries, wings 1, wings 1-2), Popular, and
   Card + Size: rows with the same Card are one card with a size to choose ("Crispy Meal" 4…7 PCS, "Wings Meal" 7 or
   14 PCS, "Shawarma Family Meal" ½ or 1 KG). The page reads it through the Apps Script and keeps the last copy on the
   phone, so it opens offline too. A card here is [name, price, description, choice type]. */
const GRID_OF = {'Fries': 'friesGrid', 'Appetizers': 'appetizerGrid', 'Meals': 'mealGrid', 'Family Meals': 'familyGrid', 'Plates': 'plateGrid',
  'Chicken Sandwiches': 'sandwichChickenGrid', 'Beef Sandwiches': 'sandwichBeefGrid', 'Other Sandwiches': 'sandwichOtherGrid',
  'Chicken Burgers': 'burgerChickenGrid', 'Beef Burgers': 'burgerBeefGrid', 'Sauces & Extras': 'sauceGrid', 'Drinks': 'drinkGrid'};
const data = {};
Object.values(GRID_OF).forEach(g => data[g] = []);

