// src/lib/terminalAfrica.js

const TA_SECRET_KEY = process.env.TERMINAL_AFRICA_SECRET_KEY;
const API_URL = "https://api.terminal.africa/v1";

/**
 * Standard headers for Terminal Africa requests
 */
const getHeaders = () => ({
  "Authorization": `Bearer ${TA_SECRET_KEY}`,
  "Content-Type": "application/json",
});

/**
 * Generate a Terminal Africa valid address object
 */
export const createAddress = async ({
  first_name,
  last_name,
  phone,
  email,
  line1,
  city,
  state,
  zip,
  country = "NG",
  is_residential = true,
}) => {
  try {
    const res = await fetch(`${API_URL}/addresses`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        first_name,
        last_name,
        phone,
        email,
        line1,
        city,
        state,
        zip,
        country,
        is_residential,
      }),
    });

    const data = await res.json();
    if (!data.status) {
      console.error("Terminal Africa Address Error:", data);
      throw new Error(data.message || "Failed to create address");
    }

    return data.data.address_id;
  } catch (error) {
    console.error("createAddress Error:", error);
    throw error;
  }
};

/**
 * Generate a Terminal Africa valid parcel object
 */
export const createParcel = async ({
  description,
  weight_in_kg,
  height_in_cm = 10,
  width_in_cm = 10,
  length_in_cm = 10,
  value,
  currency = "NGN",
}) => {
  try {
    const res = await fetch(`${API_URL}/parcels`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        description,
        weight: weight_in_kg,
        height: height_in_cm,
        width: width_in_cm,
        length: length_in_cm,
        value,
        currency,
      }),
    });

    const data = await res.json();
    if (!data.status) {
      console.error("Terminal Africa Parcel Error:", data);
      throw new Error(data.message || "Failed to create parcel");
    }

    return data.data.parcel_id;
  } catch (error) {
    console.error("createParcel Error:", error);
    throw error;
  }
};

/**
 * Fetch shipping rates between two locations
 */
export const getRates = async ({
  pickup_address_id,
  delivery_address_id,
  parcel_id,
  currency = "NGN",
}) => {
  try {
    console.log(`Getting rates: pickup=${pickup_address_id}, delivery=${delivery_address_id}, parcel=${parcel_id}`);
    const res = await fetch(`${API_URL}/rates/shipment`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        pickup_address: pickup_address_id,
        delivery_address: delivery_address_id,
        parcel_id,
        currency,
      }),
    });

    const data = await res.json();
    if (!data.status) {
      console.error("Terminal Africa Rate Error:", data);
      throw new Error(data.message || "Failed to get shipping rates");
    }

    return data.data; // Array of rates
  } catch (error) {
    console.error("getRates Error:", error);
    throw error;
  }
};

/**
 * Arrange a shipment/pickup with Terminal Africa
 */
export const arrangeShipment = async ({ rate_id, purpose = "purchase" }) => {
  try {
    const res = await fetch(`${API_URL}/shipments/arrange`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        rate_id,
        purpose,
      }),
    });

    const data = await res.json();
    if (!data.status) {
      console.error("Terminal Africa Arrange Shipment Error:", data);
      throw new Error(data.message || "Failed to arrange shipment");
    }

    return data.data;
  } catch (error) {
    console.error("arrangeShipment Error:", error);
    throw error;
  }
};
