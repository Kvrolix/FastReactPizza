import store from "../../store";
import Button from "../../ui/button";
import { Form, redirect, useActionData, useNavigation } from "react-router-dom";
import { createOrder } from "../../services/apiRestaurant";
import { useDispatch, useSelector } from "react-redux";
import { clearCart, getCart, getTotalCartPrice } from "../cart/cartSlice";
import EmptyCart from "../cart/EmptyCart";
import { formatCurrency } from "../../utils/helpers";
import { useState } from "react";
import { fetchAddress } from "../user/userSlice";

// https://uibakery.io/regex-library/phone-number
const isValidPhone = (str) =>
  /^\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/.test(
    str,
  );

function CreateOrder() {
  const [withPriority, setWithPriority] = useState(false);
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {
    username,
    status: addressStatus,
    position,
    address,
    error: errorAddress,
  } = useSelector((state) => state.user);
  const isLoadingAddress = addressStatus === "loading";
  const cart = useSelector(getCart);
  const isSubmitting = navigation.state === "submitting";
  const formErrors = useActionData();

  const totalCartPrice = useSelector(getTotalCartPrice);
  const priorityPrice = withPriority ? totalCartPrice * 0.2 : 0;
  const totalPrice = totalCartPrice + priorityPrice;

  if (!cart.length) return <EmptyCart />;
  return (
    <div className="px-4 py-6">
      <h2 className="mb-8 text-xl font-semibold">Ready to order? Let's go!</h2>

      {/* 
			<Form
				method="POST"
				action="/order/new"> */}

      <Form method="POST">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sm:basis-40">First Name</label>
          {/* <label className="">First Name</label> */}
          <div className="grow">
            <input
              className="input w-full"
              type="text"
              name="customer"
              defaultValue={username}
              required
            />
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sm:basis-40">Phone number</label>
          <div className="grow">
            <input className="input w-full" type="tel" name="phone" required />
          </div>
          {formErrors?.phone && (
            <p className="rounder-md mt-2 bg-red-100 pt-2 text-xs text-red-700">
              {formErrors.phone}
            </p>
          )}
        </div>
        <div className="relative mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sm:basis-40">Address</label>
          <div className="grow">
            <input
              className="input w-full"
              type="text"
              name="address"
              disabled={isLoadingAddress}
              defaultValue={address}
              required
            />
            {addressStatus === "error" && (
              <p className="rounder-md mt-2 bg-red-100 pt-2 text-xs text-red-700">
                {errorAddress}
              </p>
            )}
          </div>
          {!position.latitude && !position.longitude && (
            <span className="absolute right-[3px] top-[3px] z-50 sm:right-[5px] md:top-[5px]">
              <Button
                disabled={isSubmitting || isLoadingAddress}
                type="small"
                onClick={(e) => {
                  e.preventDefault();
                  dispatch(fetchAddress());
                }}
              >
                Get position
              </Button>
            </span>
          )}
        </div>

        <div className="mb-12 flex items-center gap-5">
          <input
            type="checkbox"
            name="priority"
            id="priority"
            className="h-6 w-6 accent-yellow-400 focus:ring focus:ring-yellow-500 focus:ring-offset-2"
            value={withPriority}
            onChange={(e) => setWithPriority(e.target.checked)}
          />
          <label className="font-medium" htmlFor="priority">
            Want to yo give your order priority?
          </label>
        </div>

        <div>
          <input type="hidden" name="cart" value={JSON.stringify(cart)} />
          <input
            type="hidden"
            name="position"
            value={
              position.longitude && position.latitude
                ? `${position.latitude}, ${position.longitude}`
                : ""
            }
          />
          <Button disabled={isSubmitting} type="primary">
            {isSubmitting
              ? `Placing Order...`
              : `Order now from ${formatCurrency(totalPrice)}`}
          </Button>
        </div>
      </Form>
    </div>
  );
}

export async function action({ request }) {
  // 1. Pobranie danych z formularza:
  // request.formData() to asynchroniczna metoda, która pobiera dane przesłane w formularzu.
  const formData = await request.formData();

  // 2. Konwersja danych formularza do obiektu:
  // Object.fromEntries(formData) przekształca formData (które jest iterowalnym obiektem par klucz-wartość)
  // w zwykły obiekt JavaScript, gdzie każda nazwa pola formularza jest kluczem, a jej wartość to wartość w obiekcie.
  const data = Object.fromEntries(formData);
  console.log(data); // Podgląd danych w konsoli do debugowania.

  // 3. Tworzenie obiektu zamówienia:
  // Tutaj tworzymy obiekt `order`, który zawiera wszystkie dane przesłane w formularzu.
  // - `cart`: Przekształcamy wartość koszyka z formatu JSON (string) na obiekt JavaScript za pomocą `JSON.parse()`.
  // - `priority`: Jeśli checkbox `priority` jest zaznaczony, jego wartość to "on", więc przypisujemy true, inaczej false.
  const order = {
    ...data,
    cart: JSON.parse(data.cart),
    priority: data.priority === "true",
  };
  console.log(order); // Podgląd zamówienia w konsoli do debugowania.

  const errors = {};
  if (!isValidPhone(order.phone))
    errors.phone =
      "Please give us your correct phone number. We might need it to stay in contact with you.";
  if (Object.keys(errors).length > 0) return errors;

  // 4. Wywołanie funkcji tworzącej zamówienie:
  // `createOrder(order)` to prawdopodobnie funkcja asynchroniczna, która zapisuje zamówienie w bazie danych
  // lub wykonuje inne operacje serwerowe. `newOrder` to obiekt zwracany przez tę funkcję, który zawiera np. ID zamówienia.

  const newOrder = await createOrder(order);

  //   // 5. Przekierowanie użytkownika:
  //   // Po utworzeniu zamówienia, funkcja `redirect` przenosi użytkownika na stronę z podsumowaniem zamówienia.
  //   // Przykładowo, `/order/${newOrder.id}` może być stroną pokazującą szczegóły zamówienia.

  // DO NOT OVERUSE
  store.dispatch(clearCart());
  return redirect(`/order/${newOrder.id}`);
  // return null;
}

export default CreateOrder;
