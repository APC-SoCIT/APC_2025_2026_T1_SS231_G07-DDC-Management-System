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

UC-02: Login
Author: Gabriel Villanueva Priority: High

Purpose
To allow registered users (Patient, Owner, Dentist, Receptionist) to securely access the system using their credentials.

Actors
Owner

Dentist

Receptionist

Patient

Requirement Traceability
BR-02: All users (Owner, Patient, Dentist, Receptionist) must be able to log in to the system.

Preconditions
The user is accessing the clinic system's login page.

The user has an existing account in the "User Accounts" data store.

Postconditions
On Success: The user is authenticated, a session is created, and the system grants them access based on their role.

On Failure: The user remains unauthenticated and is notified of the login failure.

Basic Flow
The user navigates to the login page.

The system displays the login form.

The user submits their "Login Credentials" (username and password).

The system queries the (User Accounts) data store to find a matching record.

If credentials are valid, the system grants access.

Alternative Flow (Login Failure)
7a1: The system validates credentials and finds they are "If Invalid".

7a2: The system sends a "Login Status (Failed)" message.

7a3: The user is shown an error message (e.g., "Invalid username or password.").

UC-03: Manage Staff Roles
Author: Michael Orenze Priority: High

Purpose
To allow the Owner to view, update, and delete the list of staff accounts (Dentists, Receptionists) and their details in the system.

Actors
Owner

Requirement Traceability
BR-49: The Owner can view staff and patient accounts details and list of all accounts.

BR-50: The Owner can edit or update existing dentists, receptionist, and patient account information.

BR-51: The Owner can delete dentist and receptionist accounts when necessary.

Preconditions
The Owner is logged into the system and has administrative privileges.

Postconditions
The "User Accounts" data store is updated with any changes (edits, deletions) submitted by the Owner.

The Owner has viewed the most current list of staff.

Basic Flow
The Owner navigates to the staff management section and requests to "View Staff List."

The system retrieves the staff list from the (User Accounts) data store and displays it.

The Owner reviews the list and makes necessary changes (e.g., updates a role, deactivates an account).

The Owner submits the updated staff list.

The system receives the update and writes the changes to the (User Accounts) data store.

The Owner receives confirmation that the list was updated.