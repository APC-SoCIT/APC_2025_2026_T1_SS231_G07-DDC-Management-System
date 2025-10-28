# 🧪 O14 Test Cases

## 🦷 Dorotheo Dental Clinic System - Test Case Documentation

Welcome to the test case documentation for the **Dorotheo Dental Clinic System**.  
This document outlines the suite of tests designed to verify the system's **functionality**, **reliability**, and **adherence to requirements** defined in the use case specifications.

The goal of this testing documentation is to ensure a **high-quality, bug-free system** that meets the needs of both patients and the clinic owner.

---

## 📘 Full Test Case Document

For the complete test plan (including preconditions, steps, and expected results for each case), please view the official document below:

**👉 [View the Full Test Case Document](https://docs.google.com/document/d/your-google-docs-link/edit?usp=sharing)**

---

## 🧾 Test Case Summary

This section provides a high-level summary of all designed test cases for the system.  
The **Status** column can be updated to track progress during the QA process.

| Test Case ID   | Use Case ID   | Test Case Name                                          | Test Case Description                                                                                                                      | Status   |
|:---------------|:--------------|:--------------------------------------------------------|:-------------------------------------------------------------------------------------------------------------------------------------------|:---------|
| TC-01          | UC-01         | Patient Registers (Basic Flow)                          | Verify a new Patient can successfully register for an account using the public registration page with valid details.                       | Not Run  |
| TC-02          | UC-01         | Owner Adds Staff (Basic Flow)                           | Verify an Owner can successfully create a new staff account (Dentist/Receptionist) from the staff management section.                      | Not Run  |
| TC-03          | UC-01         | Register with Missing Fields (Exception)                | Verify the system prevents account creation and shows an error message if required fields (e.g., email, password) are missing.             | Not Run  |
| TC-04          | UC-01         | Register with Duplicate Email (Exception)               | Verify the system prevents account creation and shows an error if the email address provided is already in the "User Accounts" data store. | Not Run  |
| TC-05          | UC-01         | Register with Invalid Email Format (Exception)          | Verify the system shows a validation error if the user tries to register with an invalid email format (e.g., "test@test").                 | Not Run  |
| TC-06          | UC-02         | Valid Login (Basic Flow)                                | Verify a registered user (Patient, Owner, Dentist, or Receptionist) can successfully log in with valid credentials.                        | Not Run  |
| TC-07          | UC-02         | Login with Invalid Password (Alternative Flow)          | Verify the system shows an "Invalid username or password" error message when a user enters a valid username but an invalid password.       | Not Run  |
| TC-08          | UC-02         | Login with Non-existent Username (Alternative Flow)     | Verify the system shows an "Invalid username or password" error message when a user enters a username that does not exist.                 | Not Run  |
