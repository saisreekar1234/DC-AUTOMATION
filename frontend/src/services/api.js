import axios from "axios";


// ======================================================
// API BASE URL
// ======================================================

const API_BASE_URL =
  "http://localhost:5000/api";


// ======================================================
// AXIOS INSTANCE
// ======================================================

const api =
  axios.create({

    baseURL:
      API_BASE_URL,

  });


// ======================================================
// REQUEST INTERCEPTOR
// ======================================================
//
// Every request automatically checks whether a JWT
// exists in localStorage.
//
// If it exists, it is sent as:
//
// Authorization: Bearer <token>
//
// ======================================================

api.interceptors.request.use(
  (config) => {

    const token =
      localStorage.getItem(
        "dc_token"
      );


    if (token) {

      config.headers.Authorization =
        `Bearer ${token}`;

    }


    return config;

  }
);


// ======================================================
// RESPONSE INTERCEPTOR
// ======================================================
//
// If the backend says the token is invalid or expired,
// remove the stored authentication data.
//
// ======================================================

api.interceptors.response.use(

  (response) => {

    return response;

  },

  (error) => {

    if (
      error.response?.status ===
      401
    ) {

      localStorage.removeItem(
        "dc_token"
      );

      localStorage.removeItem(
        "dc_user"
      );

    }


    return Promise.reject(
      error
    );

  }

);


// ======================================================
// EXPORT
// ======================================================

export default api;
