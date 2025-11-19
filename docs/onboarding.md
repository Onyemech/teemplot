Sure — here is the full, clean, well-structured Markdown version of your Teamplot Onboarding Overview.
You can copy and paste it directly into your project or save it as an .md file.


---

Teamplot Onboarding Overview (Markdown Version)

1. Authentication

Users can authenticate using Google or Email + Password.

If email authentication is chosen:

System sends a verification code to the user’s email.

User must verify the code before proceeding.




---

2. Company Setup — Stage 1

Collect the following basic user/company-representative details:

Legal First Name

Legal Last Name

Ownership Selection

Checkbox: “Are you the company owner?”

If selected → system assigns role = Owner.


Email Address

Phone Number

Date of Birth


Users click Continue to move forward.


---

3. Company Owner Details — Stage 2

Collect dedicated owner information:

First Name

Last Name

Email Address

Phone Number

Date of Birth


Users click Continue to proceed.


---

4. Business Information — Stage 3

Collect complete company data:

Company Legal Name

Tax Identification Number (TIN)

Company Size

Must be ≥ 1

Number includes the user


Website (optional)

Head Office Location

Automatically fetched via geolocation (geofencing)


Company Logo (optional upload)


Users click Continue.


---

5. Document Upload — Stage 4

Users must upload required legal documents:

Document Type	Purpose	Format	Max Size

CAC Document	Verify business details	PDF/PNG/JPEG	≤ 1 MB
Proof of Address	Verify business address	PDF/PNG/JPEG	≤ 1 MB
Company Policy Document	HR/operational policies	PDF/PNG/JPEG	≤ 1 MB


The Continue button is only enabled when all required documents are uploaded.


---

6. Review Page — Stage 5

Users are shown a full summary of the data they provided:

Sections displayed:

Company Logo

Tax Identification Number (TIN)

Company Size

Website (if provided)

Head Office Address

Company Owner Details

Uploaded Documents


Button styling:

Label: “Agree and Continue”

Background: Dark Grey or Dark Green

Text: White


On clicking, the user proceeds to plan selection.


---

7. Plans & Pricing — Stage 6

Pricing is loaded dynamically from ENV variables.
Billing is per employee, meaning:

Total Price = (Price per Employee) × (Company Size)


---

Plans Offered

Silver Monthly — 30 Days

Attendance Management

Leave Requests


Silver Yearly — 365 Days

Same features as Silver Monthly

Long-term (yearly) duration



---

Gold Monthly — 30 Days

Includes everything in Silver plus:

Performance Metrics

Tax Assignments


⭐ Includes FREE TRIAL for new companies
After the 30-day trial ends:

Access is restricted

User must choose and pay for a plan to continue



---

Gold Yearly — 365 Days

All Gold Monthly features

Yearly (longer duration)



---

8. Completion → Redirect to Dashboard

After choosing a plan (or starting the Gold free trial),
the user is redirected to the Teemplot Dashboard.


---

