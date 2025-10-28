UC-01: Register
Author: Gabriel Villanueva Priority: High

Purpose
To allow new patients to create a self-service account or for an Owner to create a new staff (Dentist, Receptionist) account in the system.

Actors
Patient

Owner

Requirement Traceability
BR-01: New patients must be able to register for an account.

BR-48: The Owner can add new dentists, receptionists, and patient accounts into the system.

Preconditions
A Patient is accessing the system's public registration page.

OR: An Owner is logged into the system and has navigated to the staff management section.

Postconditions
A new Patient or Staff account is created and stored in the "User Accounts" data store.

The Patient or Owner receives a confirmation message.

Basic Flow
The [Patient] navigates to the registration page OR the [Owner] navigates to the "Add New Staff" section.

The system displays the appropriate registration form.

The user enters "New Patient Details" or "New Staff Details".

The user submits the form.

The system receives the details and writes the new account record to the (User Accounts) data store.