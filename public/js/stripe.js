import axios from 'axios';
import { showAlert } from './alerts';

let stripe;

// Stripe script only added to tour template file - will only store to a variable if page loaded is tour page
if (document.getElementById('stripe-script')) {
  // After adding stripe script link to HTML exposes a JS object to Window to access methods
  stripe = Stripe(
    'pk_test_51Pt5OCLXoV01XKs4JxiSnwMCv389mu9n5sLZFWSQDUOBVMRIwr8vXpdrpgK29gjwKlCtBFVZHbPSiwV1RLVVefxX00gqSXkGhk',
  );
}

export const bookTour = async function (tourId) {
  try {
    // 1) Get session from server - use checkout session endpoint
    const session = await axios(
      `http://127.0.0.1:8000/api/v1/bookings/checkout-session/${tourId}`,
    );
    console.log(session);

    // 2) Use Stripe object to create checkout form and charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.error(err);
    showAlert('error', err);
  }
};
