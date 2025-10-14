# 026 Frontend Backend Communication

This document outlines the strategy, protocols, and implementation details for communication between the **React** frontend and the **Django REST Framework (DRF)** backend.

## 🚀 Strategy: RESTful API

Communication is primarily handled via a **RESTful API**. The frontend makes standard HTTP requests (GET, POST, PUT, DELETE) to designated API endpoints provided by the backend.

### 🔗 Key Protocols & Technologies

* **Protocol:** **HTTP/HTTPS**
    * All requests are made over HTTPS in production for secure, encrypted communication.
* **Data Format:** **JSON (JavaScript Object Notation)**
    * Both request bodies sent from the frontend and response bodies returned from the backend are formatted as JSON.
* **Backend:** **Django REST Framework (DRF)**
    * DRF handles serialization, routing, and view logic for all API endpoints.
* **Frontend:** **React & Axios/Fetch API**
    * The React application uses an HTTP client (e.g., **Axios** or the native **Fetch API**) to send and receive data.

## 🛠 Implementation Details

### API Endpoint Naming Convention

All API endpoints follow a consistent, resource-based naming convention, prefixed with `/api/v1/`.

* **Example (Users Resource):**
    * `GET /api/v1/users/`: Retrieve a list of users.
    * `POST /api/v1/users/`: Create a new user.
    * `GET /api/v1/users/{id}/`: Retrieve a specific user.

### Authentication & Authorization

* **Token-Based Authentication:** User authentication is managed using tokens (e.g., JWT). The frontend includes the user's token in the `Authorization` header of every protected request.
* **CORS (Cross-Origin Resource Sharing):**
    * The Django backend is configured to allow requests from the React frontend's origin to prevent CORS errors during development and production. (Configuration managed in `settings.py`).

### Error Handling

* **Status Codes:** The backend returns standard HTTP status codes (e.g., `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `500 Internal Server Error`) to clearly indicate the request result.
* **Error Responses:** Error responses include a JSON payload with a descriptive `message` and/or a `details` field to help the frontend handle and display relevant errors to the user.
