# YDL admin, page by page

Generated from `ydl-admin-structure.json` by `scripts/ydl-index.py`. Names, contact details and per-row values were removed during the crawl; only the structure is kept.

## Menu

## Dashboard

`/fitness-center/dashboard/`

Headings: Shaan Fitness Gym (Godari Gunta) · Clients with Expired Membership · Client with About to Expire Membership · Client with Balance Payments · Filters · Expected Payments (Total Payments: 0, Total Amount: 0) · My Follow Up Total Follow Ups (0) · Missed Follow-ups(137) · Today's Batches () Batchwise Attendance · Today's Collection · Current Month's Collection · Current Year's Collection
Columns: Type | Name & Number | Assign/Schedule by | To Do | Expected Date | Expected Amount | Action
Columns: Type | Name & Number | Follow up Date | Assign/Schedule by | To Do | Convertibility | Action
Columns: Type | Name & Number | Follow up Date | Assign/Schedule by | To Do | Convertibility | Action | Follow Up Date | Follow Up Assign to | Follow Up Type | Comment | Expected Date | Expected Amount
Columns: Follow Up Date | Follow Up Assign to | Follow Up Type | Comment
Columns: Follow Up Date | Follow Up Assign to | Follow Up Type | Comment | Expected Date | Expected Amount
Columns: Follow Up Date | Follow Up Assign to | Follow Up Type | Comment | Expected Date
Columns: Batch Name | Conducted By | Time | Total Check-ins | Active | Expired | Membership Not Assigned | Action
Filter labels: From
Cards: Today's Collection · Current Month's Collection · Current Year's Collection · Balance Amount · Active Gym Subscriptions · Expired Gym Subscriptions · Total Open Enquiries · Total Active Members · Present Check-ins · Live App Installs · Active PT Subscriptions · Expired PT Subscriptions
Actions: Reset Password · Log Out · View Clients · Submit · See All Follow Ups · See all Missed Follow-ups · Actions · Follow up Response · Follow Up History · See Traffic Insights · View all

Form 2:
- **Filters**
- [button] Submit
  - To · `dropdown` · select · options: Today (08 October 2026), Last 3 Days (05 October 2026 - 08 October 2026), Next 3 Days (08 October 2026 - 11 October 2026), Next 7 Days (08 October 2026 - 15 October 2026), Next 15 Days (08 October 2026 - 23 October 2026), Custom (08 October 2026 - 08 October 2026)
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `staff_assign_select` · select · options: {7 people/records}
- **Expected Payments (Total Payments: #, Total Amount: 0)**
  - `followup_type` · select · options: Select Follow Up Type, Membership Renewal, Balance due, Freeze, Assign Trial, PT Renewal, PT Trial, Referral, Transfer, Upgrade, Online Prospect(Non gym), Online Training, Trial Online PT, Ready To Sign Up, Demo Scheduled, Demo Conducted, Confirmation Calls, Gym/Studio Trial, Other
- **My Follow Up Total Follow Ups (#)**
  - `my_followup_type` · select · options: Select Follow Up Type, Membership Renewal, Enquiry, RE-Enquiry, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Online Prospect(Non gym), Online Training, Trial Online PT, Trial Online PT Feedback, Ex-Member, Ready To Sign Up, Demo Scheduled, Demo Conducted, Confirmation Calls, Gym/Studio Trial … (+1)
  - `convert_select` · select · options: Select Convertibility, Hot, Warm, Cold

Other fields:
  - `missed_followup_staff_select` · select · options: {7 people/records}
  - `dropdown_missed_followups` · select · options: Yesterday (07 October 2026), Last 30 days (08 September 2026 - 07 October 2026), Last 60 days (09 August 2026 - 07 October 2026)
  - To · `dropdown_batch` · select · options: Today (08 October 2026), Last 3 Days (05 October 2026 - 08 October 2026), Last 7 Days (01 October 2026 - 08 October 2026), Last 15 Days (23 September 2026 - 08 October 2026), Last Month (08 September 2026 - 08 October 2026), Custom (08 October 2026 - 08 October 2026)
  - `batch_end_picker_date` · text
  - `batch_start_picker_date` · text

Pop-up: **Schedule Follow Up** — buttons: Cancel
  - `call_rep` · select · options: {8 people/records}
  - `followup_date` · text
  - Assign To * · `employee_select` · select · options: {7 people/records}
  - Convertibility * · `lead_type` · select · required · options: Hot, Warm / Maybe, Cold / Not so interested, Expected, Unpitched
  - `expected_date` · date
  - `expected_amt` · number
  - `followup_notes` · textarea
  - `quick_msg` · select · options: Quick Message, Not reachable, No answer, Waiting, Busy, Incorrect, Interested, Switch Off, Call, JOINING CALL, COURTESY CALL, Call Again, JOINING CALL, COURTESY CALL, Inquired but did not ask for payment, Inquired & Payment link sent or to be sent., Call later same day or tomorrow or some other month, Costly Can not afford, Phone Cut, Half Call.Call again, Not Interested, Inquired by mistake, Joined Somewhere else, Other
  - `contact_type` · select · required · options: Phone, In Person, Email, Whatsapp, SMS
  - `followup_comment` · textarea
  - `my_followup_type` · select · options: All Followup, Membership Renewal, Enquiry, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Online Prospect(Non gym), Online Training, Trial Online PT, Trial Online PT Feedback, Nutrition, Confirmation Calls, Gym/Studio Trial, Other

Opens: `/merchant/fitness-center/customers/follow-up-list/?is_apply_filer=1&cust_followup_type=Missed_Followup&start_date={id}-08-09&end_date={id}-10-07` · `/merchant/fitness-center/customers/follow-up-list/?is_apply_filer=1&cust_followup_type=Missed_Followup&
                       &start_date={id}-08-09&end_date={id}-10-07
                       ` · `/fitness-center/customer/folloup-history/Customer-{id}/0/` · `/fitness-center/customer/subscriptions/Customer-{id}/0/` · `/merchant/fitness-center/customers/payments/?is_apply_filer=1&paymnt_status=PI&start_date={id}-10-08&end_date={id}-10-08` · `/merchant/fitness-center/customers/expiry-membership-resgister/?screen_type=SCREEN&sub_type=gym&start_date={id}-01-01&end_date={id}-10-08`

## Enquiry

### Enquiry › Add Enquiry

`/merchant/fitness-center/customers/enquiry-form/`

Headings: Enquiry Basic Information · Add Follow up · Interested Gym Services & Referral · Select A Batch · Emergency contact
Filter labels: Customer Name * · Customer Email · Mobile Number * · This mobile number is already registered with system. Click here to view client profile. · Alternate Mobile Number · Guardian Contact Mobile Number · Date of Birth · Enquiry Date * · Client Rep* · Gender * · Address · Customer Company Name · Customer GST Number · Aadhaar Number · PAN Number · Source Promotion * · Source Enquiry * · Primary Tag · Secondary Tag · Assign Trainer · Followup Stage · Type of Follow Up * · Assign To * · Response * · Convertibility * · Expected Date * · Expected Amount * · Next Follow Up Date * · Contact Type * · To Do/Comment * · Remarks/Summary · Referral by · Member Id · Third Party Referral Name · Employment Status · Occupation · Interested In · Batch · Hold down "Control", or "Command" on a Mac, to select more than one. · City · State · Country · Pincode · Guardian Contact Name · Guardian Contact Email · Relation with Guardian
Actions: Reset Password · Log Out · Lookup Member code · Lookup Enquiry code · Show Optional Fields · Back · Save & Close · Save

Form 2:
  - First name · `customer_first_name` · text · required
  - Last name · `customer_last_name` · text
  - [redacted] · `email` · text
  - `country_code` · text
  - [redacted] · `mobileNo` · text · required
  - Customer reluctant to give Mobile Number. · `add_alternate` · checkbox
  - `alt_country_code` · text
  - [redacted] · `alternate_mobileNo` · text
  - [redacted] · `em_mobileNo` · text
  - `dob` · text
  - `enquiry_date` · text
  - `created_by` · select · options: {6 people/records}
  - Male · `gender` · radio · required
  - Female · `gender` · radio · required
  - Other · `gender` · radio · required
  - Flat No.,Building name · `street1` · text
  - Street, Area · `street2` · text
  - `company_name` · text
  - `cust_gst_no` · text
  - e.g. 3675 9834 6012 · `aadhar` · number
  - Enter Pan Number · `pan_card` · text
  - Source Promotion * · `source_promo` · select · required · options: Unknown, Exterior Sign, Media Article, Television, Promotions, Other, Lead by APP, Google Ads, Facebook, Instagram, Word Of Mouth, Banner, Walk In, Member Referral, Poster, SMS, Website, Flyers, Hoarding, Just Dial, WhatsApp Marketing, Reseller, Facebook Messenger, Outbound, Country Club … (+21)
  - Source Enquiry * · `source_enquiry` · select · required · options: Unknown, Lead from Facebook, Call, Whatsapp, POS Referral, Member Referral, Walk In
  - Primary Tag · `primary_tag` · select · options: Select Primary Tag
  - Primary Tag · `secondary_tag` · select · options: Select Secondary Tag
  - `assign_trainer_select` · select · options: {9 people/records}
  - `fol_stage` · select · options: Tapped, Untapped
- **Add Follow up**
  - `follow_up_type` · select · options: Enquiry
  - Assign To * · `employee_select` · select · options: {14 people/records}
  - Response * · `followup_response` · select · required · options: Follow up Again, Successful Follow up, Not Interested - High Price, Not Interested - Joined Another Gym, Not Interested - Wrong Number, Not Interested - Relocated, Not Interested - Other
  - Convertibility * · `foll_lead_type` · select · required · options: Select The Convertibility, Hot, Warm / Maybe, Cold / Not so interested, Expected, Successful Follow up, Unpitched
  - `expected_date` · date
  - `expected_amt` · text
  - Next Follow Up Date * · `followup_date` · text · required
  - Contact Type * · `contact_type` · select · required · options: Phone, In Person, Email, Whatsapp, SMS
  - To Do/Comment * · `followup_notes` · textarea · required
  - `quick_msg` · select · options: Quick Message, Not reachable, No answer, Waiting, Busy, Incorrect, Interested, Switch Off, Call, Joining Call, Courtesy Call, Call Again, Demo Scheduled Waiting For Final Confirmation, Demo Scheduled, Inquired but did not ask for payment, Inquired & Payment link sent or to be sent., Call later same day or tomorrow or some other month, Costly Cannot afford, Phone Cut, Half Call.Call again, Not Interested, Inquired by mistake, Joined Somewhere else, Other
  - `customer_notes` · textarea
  - `trainer_select` · select · options: {15 people/records}
  - Enter Member Code · `cust_id` · text
  - Write Third Party Referral Name · `cust_outside_referal` · text
- [button] Show Optional Fields
  - Followup Stage · `emp_status` · select · options: Unknown, STUDENT, WORKING, NOT WORKING, SELF EMPLOYED, HOUSE WIFE
  - `occupation_name` · text
- **Interested Gym Services & Referral**
  - Weight Training · `fitness_category` · checkbox
  - Cardio · `fitness_category` · checkbox
  - Cross-fit · `fitness_category` · checkbox
  - Personal Training / Nutrition · `fitness_category` · checkbox
  - Calisthenics · `fitness_category` · checkbox
  - HIIT · `fitness_category` · checkbox
  - Strength Training · `fitness_category` · checkbox
  - Group Activity · `fitness_category` · checkbox
  - Nutrition · `fitness_category` · checkbox
  - Steam · `fitness_category` · checkbox
  - Locker · `fitness_category` · checkbox
  - Free Body Weight · `fitness_category` · checkbox
- **Select A Batch**
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
  - `city` · text
  - `state` · text
  - `country` · text
  - `pincode` · text
- **Emergency contact**
  - First name · `em_first_name` · text
  - Last name · `em_last_name` · text
  - [redacted] · `em_email` · text
  - `relationship` · text
- [button] Back
- [button] Save & Close
- [button] Save

### Enquiry › Enquiry List

`/merchant/fitness-center/customers/enquiry-list/`

Headings: Enquiries List
Columns: # | Date | Staff Name | Total Enquiries(Open & Not Interested) Added | 1
Columns: Enquiry Code | Date of Enquiry | Name & Number | Trial Booked | Remarks | Handled By | Source of Enquiry | Source of Promotion | Comment | Action
Filter labels: From · Source of Promotion · Gender · Lead Type · Lead Status · Client Rep · On Trial · Followup Stage · Assigned Trainer · Filter by Date · Source of Enquiry
Actions: Reset Password · Log Out · Search · Deactivated Enquiries · Deactivate · Delete · Add Enquiry · Export to CSV · View Analysis · Submit · Mark as Tapped · Send Notification · Send Customized WhatsApp · Copy code · Actions · Add Follow up · Close Enquiry · Send Whatsapp

Form 2:
- [button] x
- **Filters**
- **Enquiries**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Lead Status**
  - Open Enquiry · `lead_status` · checkbox
  - Not Interested · `lead_status` · checkbox
- **Members by Age**
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
- **Lead Type**
  - Hot / Expected · `lead_type` · checkbox
  - Warm / May be · `lead_type` · checkbox
  - Cold / Not so interested · `lead_type` · checkbox
- [button] Close
- [button] Apply
- **Enquiries List**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Mobile Number or Email Address · `search_list` · text
- [button] Search
- [button] Deactivate
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE SELECTED ENQUIRY ?**
- [button] Yes
- [button] No
- [button] Delete
- [button] Export to CSV
- [button] Submit
  - To · `dropdown` · select · options: All Data 📅, This Month (01 October 2026 - 08 October 2026), Last Month (01 September 2026 - 30 September 2026), Last 30 Days (08 September 2026 - 08 October 2026), Last 15 Days (23 September 2026 - 08 October 2026), Last 7 Days (01 October 2026 - 08 October 2026), Last 3 Months (10 July 2026 - 08 October 2026), Last 6 Months (11 April 2026 - 08 October 2026), Custom (07 March 2013 - 08 October 2026)
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `source_promo` · select · options: All, Lead by APP, Unknown, GOOGLE ADS, FACEBOOK, WHATSAPP, INSTAGRAM, WORD OF MOUTH, Banner, Walk In, Passing By, Member Referral, Poster, SMS, Website, Flyers, Hoarding, Just Dial, WhatsApp Marketing, ADs, Exterior Sign, Media Article, Television, Promotions, Hotel Guest … (+8)
  - `emp_status` · select · options: All, Male, Female, Other
  - `convert_select` · select · options: All Convertibility, Hot, Warm, Cold, Expected, Unpitched
  - `lead_status_select` · select · options: Open Enquiries, Not Interested
  - Client Rep · `staff_assign_select` · select · options: {8 people/records}
  - `on_trial` · select · options: All, Yes, No
  - `fol_stage` · select · options: All Stage, Untapped, Tapped
  - Assigned Trainer · `trainer_assign_select` · select · options: {17 people/records}
  - `filter_by` · select · options: By Created Date, By Follow up Stage
  - `source_enquiry` · select · options: All, Walk In, Lead from Facebook, Call, Whatsapp, POS Referral, Member Referral, Telephonic, Buddy Referral, Trainer Referral, Instagram, Interakt, Email Inquiry, Lead from Meta, Facebook
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS ENQUIRY ?**
- [button] Yes
- [button] No
- [button] Mark as Tapped
- [button] Send Notification
- [button] Send Customized WhatsApp
- [button] x
- **SEND WHATSAPP MESSAGE**
  - Write your whatsapp message here... · `text_sms_body` · textarea
- [button] Send WhatsApp
- [button] Cancel
- [button] x
- **Send Notification**
- **Notification**
  - Make sure your title is short and explanatory. · `noti_name` · text
- **Notification Body**
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea
- [button] Close
- [button] Send Notification
  - `check-all-box` · checkbox
- [button] Actions
- [button] x
- **Schedule Follow Up**
- **[row value]**
- [button] Cancel
- [button] Confirm
- [button] Actions
- [button] x
- **... repeated once per row (10 rows on the page)**

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Open Enquiry · `lead_status` · checkbox
  - Not Interested · `lead_status` · checkbox
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
  - Hot / Expected · `lead_type` · checkbox
  - Warm / May be · `lead_type` · checkbox
  - Cold / Not so interested · `lead_type` · checkbox

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE SELECTED ENQUIRY ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS ENQUIRY ?** — buttons: No

Pop-up: **SEND WHATSAPP MESSAGE** — buttons: Send WhatsApp, Cancel
  - Write your whatsapp message here... · `text_sms_body` · textarea

Pop-up: **Send Notification** — buttons: Send Notification
  - Make sure your title is short and explanatory. · `noti_name` · text
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea

Pop-up: **Schedule Follow Up** — buttons: Cancel
  - `follow_up_type` · select · options: Enquiry, Membership Renewal, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Referral, Transfer, Upgrade, Online Prospect(Non gym), Online Training, Massage, Trial Online PT, Trial Online PT Feedback, Nutrition, Other, Ex-Member, Ready To Sign Up … (+7)
  - Assign To * · `employee_select` · select · options: {7 people/records}
  - Response * · `followup_response` · select · required · options: Open Follow up, Successful Follow up, Not Interested - Rates to high, Not Interested - Joined Another Gym, Not Interested - Wrong number, Not Interested - Relocated, Not Interested - other
  - Convertibility * · `lead_type` · select · required · options: Hot, Warm / Maybe, Cold / Not so interested, Expected, Successful Follow up, Unpitched
  - `expected_date` · date
  - `expected_amt` · number
  - Next Follow Up Date * · `followup_date` · text
  - Contact Type * · `contact_type` · select · required · options: Phone, In Person, Email, Whatsapp, SMS
  - To Do/Comment * · `followup_notes` · textarea
  - `quick_msg` · select · options: Quick Message, Not reachable, No answer, Waiting, Busy, Incorrect, Interested, Switch Off, Call, JOINING CALL, COURTESY CALL, Inquired but did not ask for payment, Inquired & Payment link sent or to be sent., Call later same day or tomorrow or some other month, Costly Cannot afford, Phone Cut, Half Call.Call again, Not Interested, Inquired by mistake, Joined Somewhere else, Other

Opens: `/fitness-center/customer/Customer-{id}/` · `/fitness-center/customer/folloup-history/Customer-{id}/0/` · `/merchant/fitness-center/customers/edit-enquiry/?customer_id={id}&action=close_enquiry` · `/merchant/fitness-center/customers/enquiry-form/Customer-{id}/`

## Follow Ups

`/merchant/fitness-center/customers/follow-up-list/`

Headings: Follow Up Dashboard Welcome, [person]
Filter labels: Gender · Convertibility · Call Response · Assign To · What would you like to do ? · From · Comment Added By · Client Rep. · Follow Up Type · Client Type
Actions: Reset Password · Log Out · Delete · Transfer Follow ups · View Analysis · Export to CSV · Search

Form 2:
- **Follow Up Dashboard Welcome, [person]**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
- [button] Delete
- [button] Transfer Follow ups
- [button] x
- **Transfer Follow Ups**
- **Transfer From**
  - Select Staff from · `transfer_from` · select · required · options: {6 people/records}
- **Transfer to**
  - Select Staff from · `transfer_to` · select · required · options: {6 people/records}
- [button] Close
- [button] Transfer follow ups
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE SELECTED FOLLOW-UP ?**
- [button] Yes
- [button] No
  - `gender_select` · select · options: All, Male, Female, Other
  - `convert_select` · select · options: All Convertibility, Hot, Warm, Cold, Expected, Unpitched
  - `type_select` · select · options: All Status, Open, Follow Ups Done, Not Interested, Successful
  - Assign To · `staff_assign_select` · select · options: {8 people/records}
  - What would you like to do ? · `cust_followup_type` · select · options: Missed /Due Follow Ups, Follow Ups Done, Expected Follow Ups
  - `end_picker_date` · text
  - `start_picker_date` · text
  - Comment Added By · `comment_added_select` · select · options: All Staff, System Generated, [person], [person], [person], [person], [person], [person]
  - Client Rep. · `client_rep_select` · select · options: {7 people/records}
  - `followup_type` · select · options: All Follow Up Type, Membership Renewal, Membership Enquiry, Enquiry, Re-Enquiry, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Referral, Transfer, Upgrade, Online Prospect(Non gym), Online Training, Trial Online PT, Trial Online PT Feedback, Nutrition, Other … (+6)
  - `client_select` · select · options: All, Enquiry, Member
- [button] Export to CSV
- [button] Search
  - `show_staff_insights` · checkbox

Pop-up: **Transfer Follow Ups** — buttons: Transfer follow ups
  - Select Staff from · `transfer_from` · select · required · options: {6 people/records}
  - Select Staff from · `transfer_to` · select · required · options: {6 people/records}

Pop-up: **ARE YOU SURE YOU WANT TO DELETE SELECTED FOLLOW-UP ?** — buttons: No

## Members

### Members › Add Member

`/fitness-center/customer/basic-information/`

Headings: Member Information · Member Status · New Enquiry · Referral · Select A Batch · Customer Address · Emergency contact
Filter labels: Member Name * · Member Email · Mobile Number * · Alternate Mobile Number · Date of Birth · Enquiry Date * · Client Rep* · Gender * · Reference Number · Aadhaar Number · PAN Number · Customer GST Number · Customer Company Name · Assign Trainer · Member Status* · Remarks/Summary · Referral by* · Member Id · Third Party Referral Name · Source Promotion · Primary Tag · Secondary Tag · Employment Status · Batch · Hold down "Control", or "Command" on a Mac, to select more than one. · Address · City · State · Country · Pincode · Guardian Contact Name · Guardian Contact Email · Guardian Contact Mobile Number · Relation with Guardian
Actions: Reset Password · Log Out · Lookup Member code · Lookup Enquiry code · Back · Save & Close · Save

Form 2:
  - First name · `customer_first_name` · text · required
  - Last name · `customer_last_name` · text
  - [redacted] · `email` · text
  - `country_code` · text
  - [redacted] · `mobileNo` · text · required
  - Customer reluctant to give Mobile Number. · `add_alternate` · checkbox
  - `alt_country_code` · text
  - [redacted] · `alternate_mobileNo` · text
  - `dob` · text
  - `enquiry_date` · text
  - `created_by` · select · options: {6 people/records}
  - Male · `gender` · radio · required
  - Female · `gender` · radio · required
  - Other · `gender` · radio · required
  - `ref_no` · text
  - e.g. 3675 9834 6012 · `aadhar` · number
  - Enter Pan Number · `pan_card` · text
  - `cust_gst_no` · text
  - `company_name` · text
  - `assign_trainer_select` · select · options: {17 people/records}
- **Member Status**
- **New Enquiry**
  - `customer_notes` · textarea
- **Referral**
  - `trainer_select` · select · options: {23 people/records}
  - Enter Member Code · `cust_id` · text
  - Write Third Party Referral Name · `cust_outside_referal` · text
  - Source Promotion · `source_promo` · select · options: Unknown, Google Ads, Facebook, Instagram, Word Of Mouth, Banner, Walk In, Passing By, Member Referral, Poster, SMS, Website, Flyers, Hoarding, Country Club, Message, Phone, Other, Just Dial, Hotel Guest, Database 1, Database 2, Database 3, Database 4, Database 5 … (+13)
  - Primary Tag · `primary_tag` · select · options: Select Primary Tag
  - Primary Tag · `secondary_tag` · select · options: Select Secondary Tag
  - Employment Status · `emp_status` · select · options: Unknown, STUDENT, WORKING, NOT WORKING, SELF EMPLOYED, HOUSE WIFE
- **Select A Batch**
  - Batch · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- **Customer Address**
  - Flat No., Building name · `street1` · text
  - Street, Area · `street2` · text
  - `city` · text
  - `state` · text
  - `country` · text
  - `pincode` · text
- **Emergency contact**
  - First name · `em_first_name` · text
  - Last name · `em_last_name` · text
  - [redacted] · `em_email` · text
  - [redacted] · `em_mobileNo` · number
  - `relationship` · text
- [button] Back
- [button] Save & Close
- [button] Save

### Members › Add Quick Member

`/fitness-center/customer-basic/basic-information/`

Headings: Add Member Information · Member Status · New Enquiry · Referral · Select A Batch · Customer Address · Emergency contact
Filter labels: Member Name * · Member Email · Mobile Number * · Alternate Mobile Number · Client Rep * · Gender * · Date of Birth · Remarks/Summary · Reference Number · Customer GST Number · Member Status* · Referral by* · Member Id · Source Promotion · Employment Status · Organization · Batch · Hold down "Control", or "Command" on a Mac, to select more than one. · Address · City · State · Country · Pincode · Emergency Contact Name · Emergency Contact Email · Emergency Contact Mobile Number · Relationship
Actions: Reset Password · Log Out · Show Optional Fields · Lookup Member code · Lookup Enquiry code · Back · Save & Close · Save

Form 2:
  - First name · `customer_first_name` · text · required
  - Last name · `customer_last_name` · text
  - [redacted] · `email` · text
  - `country_code` · text
  - [redacted] · `mobileNo` · text · required
  - Customer reluctant to give Mobile Number. · `add_alternate` · checkbox
  - `alt_country_code` · text
  - [redacted] · `alternate_mobileNo` · text
  - `created_by` · select · options: {6 people/records}
  - Male · `gender` · radio · required
  - Female · `gender` · radio · required
  - `dob` · text
  - `customer_notes` · textarea
- [button] Show Optional Fields
  - `ref_no` · text
  - `cust_gst_no` · text
- **Member Status**
- **New Enquiry**
- **Referral**
  - `trainer_select` · select · options: {23 people/records}
  - Enter Member Code · `cust_id` · text
  - Source Promotion · `source_promo` · select · options: Unknown, GOOGLE ADS, FACEBOOK, INSTAGRAM, WORD OF MOUTH, Banner, Walk In, Passing By, Member Referral, Poster, SMS, Website, Flyers, Hoarding, Country Club, Enquiry QR or Link, Lead from Facebook, Trial passes
  - Employment Status · `emp_status` · select · options: Unknown, STUDENT, WORKING, NOT WORKING, SELF EMPLOYED, HOUSE WIFE
  - `company_name` · text
- **Select A Batch**
  - Batch · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- **Customer Address**
  - Flat No., Building name · `street1` · text
  - Street, Area · `street2` · text
  - `city` · text
  - `state` · text
  - `country` · text
  - `pincode` · text
- **Emergency contact**
  - First name · `em_first_name` · text
  - Last name · `em_last_name` · text
  - [redacted] · `em_email` · text
  - [redacted] · `em_mobileNo` · text
  - `relationship` · text
- [button] Back
- [button] Save & Close
- [button] Save

### Members › My Members

`/merchant/fitness-centers/customers/`

Headings: My Members Listing
Columns: Member Name & Number | Member Code | Gender | Added By | Checkin Status | App Access | Biometric Status | Action
Filter labels: From · Source of Promotion · Gender · Lead Type · Client Rep · Assigned Trainer · Members Status · Services · Memberships · App Status
Actions: Reset Password · Log Out · Search · Delete · Deactivate · Refresh Login · Import Members · Incorrect Entries · Deactivated Members · Add Member · Export to CSV · View Analysis · Submit · Total Active : # · Total Pending : # · Total Inactive : # · Total Members With No Subscription : # · Send Notification · Send Customized WhatsApp · Send Email · Actions · View · Add Follow up · Follow Up History

Form 2:
- [button] x
- **Filters**
- **Members**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Member Status**
  - New Members · `new_members` · checkbox
  - New Inquires · `new_inquires` · checkbox
  - Active Members · `active_members` · checkbox
  - Inactive Members · `inactive_members` · checkbox
  - Never Checked-In · `nvr_checkedIn_members` · checkbox
  - Members Retained · `members_retained` · checkbox
- **Members by Age**
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
- **Members by Level**
  - Beginner · `member_level` · checkbox
  - Intermediate · `member_level` · checkbox
  - Advanced · `member_level` · checkbox
- **Bounced**
  - Bounced Members · `bounced_members` · checkbox
- [button] Close
- [button] Apply
- **My Members Listing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Mobile Number or Email Address · `search_list` · text
- [button] Search
- [button] Delete
- [button] Deactivate
- [button] Refresh Login
- [button] Export to CSV
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE SELECTED MEMBER ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE SELECTED MEMBER ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE SELECTED MEMBER ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO REFRESH LOGIN SELECTED MEMBER ?**
- [button] Yes
- [button] No
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `source_promo` · select · options: All, Lead by APP, Unknown, GOOGLE ADS, FACEBOOK, WHATSAPP, INSTAGRAM, WORD OF MOUTH, Banner, Walk In, Passing By, Member Referral, Poster, SMS, Website, Flyers, Hoarding, Just Dial, WhatsApp Marketing, ADs, Exterior Sign, Media Article, Television, Promotions, Hotel Guest … (+8)
  - `emp_status` · select · options: All, Male, Female, Other
  - `convert_select` · select · options: All Convertibility, Hot, Warm, Cold, Expected, Unpitched
  - Client Rep · `staff_assign_select` · select · options: {7 people/records}
  - Assigned Trainer · `trainer_assign_select` · select · options: {17 people/records}
  - `sub_status` · select · options: All Members, Live Members, Members with Pending Subscription, Inactive Members, Members Without Subscription
  - `services` · select · options: All Service, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
  - `membership_name` · select · options: {64 people/records}
  - App Status · `app_status` · select · options: Select App Status, App Installed, App Not Installed
- [button] Total Active : #
- [button] Total Pending : #
- [button] Total Inactive : #
- [button] Total Members With No Subscription : #
- [button] Send Notification
- [button] Send Customized WhatsApp
- [button] Send Email
- [button] x
- **SEND WHATSAPP MESSAGE**
  - Write your whatsapp message here... · `text_sms_body` · textarea
- [button] Send WhatsApp
- [button] Cancel
- [button] x
- **Send Notification**
- **Notification**
  - Make sure your title is short and explanatory. · `noti_name` · text
- **Notification Body**
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea
- [button] Close
- [button] Send Notification
- [button] x
- **Send Email**
- **Email**
  - Make sure your title is short and explanatory. · `email_subject` · text
- **Email Body**
  - Description you provide should explain the notification clearly in short. · `email_body` · textarea
- [button] Close
- [button] Send Email
  - `check-all-box` · checkbox
- [button] Actions
- [button] x
- **Schedule Follow Up**
- **[row value]**
- [button] Cancel
- [button] Confirm
- [button] Actions
- [button] x
- **... repeated once per row (15 rows on the page)**

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - New Members · `new_members` · checkbox
  - New Inquires · `new_inquires` · checkbox
  - Active Members · `active_members` · checkbox
  - Inactive Members · `inactive_members` · checkbox
  - Never Checked-In · `nvr_checkedIn_members` · checkbox
  - Members Retained · `members_retained` · checkbox
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
  - Beginner · `member_level` · checkbox
  - Intermediate · `member_level` · checkbox
  - Advanced · `member_level` · checkbox
  - Bounced Members · `bounced_members` · checkbox

Pop-up: **ARE YOU SURE YOU WANT TO DELETE SELECTED MEMBER ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE SELECTED MEMBER ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE SELECTED MEMBER ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO REFRESH LOGIN SELECTED MEMBER ?** — buttons: No

Pop-up: **SEND WHATSAPP MESSAGE** — buttons: Send WhatsApp, Cancel
  - Write your whatsapp message here... · `text_sms_body` · textarea

Pop-up: **Send Notification** — buttons: Send Notification
  - Make sure your title is short and explanatory. · `noti_name` · text
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea

Pop-up: **Send Email** — buttons: Send Email
  - Make sure your title is short and explanatory. · `email_subject` · text
  - Description you provide should explain the notification clearly in short. · `email_body` · textarea

Pop-up: **Schedule Follow Up** — buttons: Cancel
  - `follow_up_type` · select · options: Enquiry, Membership Renewal, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Referral, Transfer, Upgrade, Online Prospect(Non gym), Online Training, Massage, Trial Online PT, Trial Online PT Feedback, Nutrition, Other, Ex-Member, Ready To Sign Up … (+7)
  - Assign To * · `employee_select` · select · options: {7 people/records}
  - Response * · `followup_response` · select · required · options: Open Follow up, Successful Follow up, Not Interested - Rates to high, Not Interested - Joined Another Gym, Not Interested - Wrong number, Not Interested - Relocated, Not Interested - other
  - Convertibility * · `lead_type` · select · required · options: Hot, Warm / Maybe, Cold / Not so interested, Expected, Successful Follow up, Unpitched
  - `expected_date` · date
  - `expected_amt` · number
  - Next Follow Up Date * · `followup_date` · text
  - Contact Type * · `contact_type` · select · required · options: Phone, In Person, Email, Whatsapp, SMS
  - To Do/Comment * · `followup_notes` · textarea
  - `quick_msg` · select · options: Quick Message, Not reachable, No answer, Waiting, Busy, Incorrect, Interested, Switch Off, Call, JOINING CALL, COURTESY CALL, Inquired but did not ask for payment, Inquired & Payment link sent or to be sent., Call later same day or tomorrow or some other month, Costly Cannot afford, Phone Cut, Half Call.Call again, Not Interested, Inquired by mistake, Joined Somewhere else, Other

Opens: `/fitness-center/customer/Customer-{id}/` · `/fitness-center/customer/folloup-history/Customer-{id}/0/` · `/fitness-center/customer/basic-information/Customer-{id}/`

### Members › Client DataBase

`/merchant/fitness-center/client-database/`

Headings: Clients List
Columns: Client Code | Date of Entry | Name & Number | Type | Handled By | Source OF Promotion | Action
Filter labels: From · Source of Promotion · Employment Type · Lead Type · Client Rep · Batch List · Gender · Client Type · Assigned Trainer · App Status
Actions: Reset Password · Log Out · Search · Delete · Transfer Client · Export to CSV · Refresh Login · Import Members · Incorrect Entries · Add Member · Submit · Send Notification · Send Customized WhatsApp · Copy code · Actions · Add Follow up · Follow Up History · Close Enquiry · Not Interested · Send Whatsapp · Interested

Form 2:
- [button] x
- **Filters**
- **Enquiries**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Lead Status**
  - Open Enquiry · `lead_status` · checkbox
  - Not Interested · `lead_status` · checkbox
- **Members by Age**
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
- **Lead Type**
  - Hot / Expected · `lead_type` · checkbox
  - Warm / May be · `lead_type` · checkbox
  - Cold / Not so interested · `lead_type` · checkbox
- [button] Close
- [button] Apply
- **Clients List**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Mobile Number or Email Address · `search_list` · text
- [button] Search
- [button] Delete
- [button] Transfer Client
- [button] Export to CSV
- [button] Refresh Login
- [button] Export to CSV
- [button] x
- **ARE YOU SURE YOU WANT TO REFRESH LOGIN SELECTED MEMBER ?**
- [button] Yes
- [button] No
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `source_promo` · select · options: All, Lead by APP, Unknown, GOOGLE ADS, FACEBOOK, WHATSAPP, INSTAGRAM, WORD OF MOUTH, Banner, Walk In, Passing By, Member Referral, Poster, SMS, Website, Flyers, Hoarding, Just Dial, WhatsApp Marketing, ADs, Exterior Sign, Media Article, Television, Promotions, Hotel Guest … (+8)
  - `emp_status` · select · options: All, Unknown, STUDENT, WORKING, NOT WORKING, SELF EMPLOYED, HOUSE WIFE
  - `convert_select` · select · options: All Convertibility, Hot, Warm, Cold, Expected, Unpitched
  - Client Rep · `staff_assign_select` · select · options: {16 people/records}
  - Batch List · `cust_batch_select` · select · options: {27 people/records}
  - `gender_filter` · select · options: All, Male, Female, Other
  - Client Type · `client_type` · select · options: All Clients, Enquiry, Member
  - Assigned Trainer · `trainer_assign_select` · select · options: {17 people/records}
  - App Status · `app_status` · select · options: Select App Status, App Installed, App Not Installed
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS ENQUIRY ?**
- [button] Yes
- [button] No
- [button] Send Notification
- [button] Send Customized WhatsApp
- [button] x
- **SEND WHATSAPP MESSAGE**
  - Write your whatsapp message here... · `text_sms_body` · textarea
- [button] Send WhatsApp
- [button] Cancel
- [button] x
- **Send Notification**
- **Notification**
  - Make sure your title is short and explanatory. · `noti_name` · text
- **Notification Body**
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea
- [button] Close
- [button] Send Notification
  - `check-all-box` · checkbox
- [button] Actions
- [button] x
- **Schedule Follow Up**
- **[row value]**
- [button] Cancel
- [button] Confirm
- [button] Actions
- [button] x
- **... repeated once per row (30 rows on the page)**

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Open Enquiry · `lead_status` · checkbox
  - Not Interested · `lead_status` · checkbox
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
  - Hot / Expected · `lead_type` · checkbox
  - Warm / May be · `lead_type` · checkbox
  - Cold / Not so interested · `lead_type` · checkbox

Pop-up: **ARE YOU SURE YOU WANT TO REFRESH LOGIN SELECTED MEMBER ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS ENQUIRY ?** — buttons: No

Pop-up: **SEND WHATSAPP MESSAGE** — buttons: Send WhatsApp, Cancel
  - Write your whatsapp message here... · `text_sms_body` · textarea

Pop-up: **Send Notification** — buttons: Send Notification
  - Make sure your title is short and explanatory. · `noti_name` · text
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea

Pop-up: **Schedule Follow Up** — buttons: Cancel
  - `follow_up_type` · select · options: Enquiry, Membership Renewal, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Referral, Transfer, Upgrade, Online Prospect(Non gym), Online Training, Massage, Trial Online PT, Trial Online PT Feedback, Nutrition, Other, Ex-Member, Ready To Sign Up … (+7)
  - Assign To * · `employee_select` · select · options: {15 people/records}
  - Response * · `followup_response` · select · required · options: Open Follow up, Successful Follow up, Not Interested - Rates to high, Not Interested - Joined Another Gym, Not Interested - Wrong number, Not Interested - Relocated, Not Interested - other
  - Convertibility * · `lead_type` · select · required · options: Hot, Warm / Maybe, Cold / Not so interested, Expected, Successful Follow up, Unpitched
  - `expected_date` · date
  - `expected_amt` · number
  - Next Follow Up Date * · `followup_date` · text
  - Contact Type * · `contact_type` · select · required · options: Phone, In Person, Email, Whatsapp, SMS
  - To Do/Comment * · `followup_notes` · textarea
  - `quick_msg` · select · options: Quick Message, Not reachable, No answer, Waiting, Busy, Incorrect, Interested, Switch Off, Call, JOINING CALL, COURTESY CALL, Inquired but did not ask for payment, Inquired & Payment link sent or to be sent., Call later same day or tomorrow or some other month, Costly Cannot afford, Phone Cut, Half Call.Call again, Not Interested, Inquired by mistake, Joined Somewhere else, Other

Opens: `/fitness-center/customer/Customer-{id}/` · `/fitness-center/customer/folloup-history/Customer-{id}/0/` · `/fitness-center/customer/basic-information/Customer-{id}/` · `/merchant/fitness-center/customers/edit-enquiry/?customer_id={id}&action=close_enquiry` · `/merchant/fitness-center/customers/edit-enquiry/?customer_id={id}&action=not_interested` · `/merchant/fitness-center/customers/enquiry-form/Customer-{id}/ ` · `/merchant/fitness-center/customers/edit-enquiry/?customer_id={id}&action=interested`

### Members › Client Referrals

`/merchant/fitness-center/referals-client-database/`

Headings: Client Referrals List
Columns: Client Code | Date of Referral | Referral from | Referral from type | Referred to | Referral_no | Referral Address | Referral Has downloaded
Filter labels: Created Date
Actions: Reset Password · Log Out · Submit · Search

Form 2:
- **Client Referrals List**
  - Created Date · `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
- [button] Submit
  - Search by Mobile Number or Email Address · `search_list` · text
- [button] Search
  - `check-all-box` · checkbox

### Members › Members Birthday Listing

`/merchant/fitness-center/customer-birthday/`

Headings: Members Birthday Listing
Columns: Member Name & Number | Member Code | Gender | Added By | Birthday Date | App Access | Action
Filter labels: Birth Date · Source of Promotion · Gender · Lead Type · Members Status · Client Rep · Assigned Trainer
Actions: Reset Password · Log Out · Search · Delete · Deactivate · Activate · Export to CSV · Submit · Send Notification · Send SMS · Copy code · Actions · View · Add Follow up · Follow Up History

Form 2:
- [button] x
- **Filters**
- **Members**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Member Status**
  - New Members · `new_members` · checkbox
  - New Inquires · `new_inquires` · checkbox
  - Active Members · `active_members` · checkbox
  - Inactive Members · `inactive_members` · checkbox
  - Never Checked-In · `nvr_checkedIn_members` · checkbox
  - Members Retained · `members_retained` · checkbox
- **Members by Age**
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
- **Members by Level**
  - Beginner · `member_level` · checkbox
  - Intermediate · `member_level` · checkbox
  - Advanced · `member_level` · checkbox
- **Bounced**
  - Bounced Members · `bounced_members` · checkbox
- [button] Close
- [button] Apply
- **Members Birthday Listing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Mobile Number or Email Address · `search_list` · text
- [button] Search
- [button] Delete
- [button] Deactivate
- [button] Activate
- [button] Export to CSV
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE SELECTED MEMBER ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE SELECTED MEMBER ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE SELECTED MEMBER ?**
- [button] Yes
- [button] No
- [button] Submit
  - `source_promo` · select · options: All, Unknown, GOOGLE ADS, FACEBOOK, INSTAGRAM, WORD OF MOUTH, Banner, Walk In, Passing By, Member Referral, Poster, SMS, Website, Flyers, Hoarding, Hotel Guest, Database 1, Database 2, Database 3, Database 4, Database 5, Enquiry QR or Link, Lead from Facebook
  - `emp_status` · select · options: All, Male, Female, Other
  - `convert_select` · select · options: All Convertibility, Hot, Warm, Cold, Expected
  - `sub_status` · select · options: All Members, Live Members, Inactive Members
  - Client Rep · `staff_assign_select` · select · options: {7 people/records}
  - Assigned Trainer · `trainer_assign_select` · select · options: {17 people/records}
- [button] Send Notification
- [button] Send SMS
- [button] x
- **Send SMS**
- **SMS Body**
  - Keep your SMS short. · `text_sms_body` · textarea
- [button] Send SMS
- [button] Cancel
- [button] x
- **Send Notification**
- **Notification**
  - Make sure your title is short and explanatory. · `noti_name` · text
- **Notification Body**
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea
- [button] Close
- [button] Send Notification
  - `check-all-box` · checkbox
- [button] Actions
- [button] x
- **Schedule Follow Up**
- **[row value]**
- [button] Cancel
- [button] Confirm
- [button] Actions
- [button] x
- **... repeated once per row (25 rows on the page)**

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - New Members · `new_members` · checkbox
  - New Inquires · `new_inquires` · checkbox
  - Active Members · `active_members` · checkbox
  - Inactive Members · `inactive_members` · checkbox
  - Never Checked-In · `nvr_checkedIn_members` · checkbox
  - Members Retained · `members_retained` · checkbox
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
  - Beginner · `member_level` · checkbox
  - Intermediate · `member_level` · checkbox
  - Advanced · `member_level` · checkbox
  - Bounced Members · `bounced_members` · checkbox

Pop-up: **ARE YOU SURE YOU WANT TO DELETE SELECTED MEMBER ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE SELECTED MEMBER ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE SELECTED MEMBER ?** — buttons: No

Pop-up: **Send SMS** — buttons: Send SMS, Cancel
  - Keep your SMS short. · `text_sms_body` · textarea

Pop-up: **Send Notification** — buttons: Send Notification
  - Make sure your title is short and explanatory. · `noti_name` · text
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea

Pop-up: **Schedule Follow Up** — buttons: Cancel
  - `follow_up_type` · select · options: Enquiry, Membership Renewal, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Referral, Transfer, Upgrade, Online Prospect(Non gym), Online Training, Massage, Trial Online PT, Trial Online PT Feedback, Nutrition, Other, Ex-Member, Ready To Sign Up … (+7)
  - Assign To * · `employee_select` · select · options: {7 people/records}
  - Response * · `followup_response` · select · required · options: Open Follow up, Successful Follow up, Not Interested - Rates to high, Not Interested - Joined Another Gym, Not Interested - Wrong number, Not Interested - Relocated, Not Interested - other
  - Convertibility * · `lead_type` · select · required · options: Hot, Warm / Maybe, Cold / Not so interested, Expected, Successful Follow up, Unpitched
  - `expected_date` · date
  - `expected_amt` · number
  - Next Follow Up Date * · `followup_date` · text
  - Contact Type * · `contact_type` · select · required · options: Phone, In Person, Email, Whatsapp, SMS
  - To Do/Comment * · `followup_notes` · textarea
  - `quick_msg` · select · options: Quick Message, Not reachable, No answer, Waiting, Busy, Incorrect, Interested, Switch Off, Call, JOINING CALL, COURTESY CALL, Inquired but did not ask for payment, Inquired & Payment link sent or to be sent., Call later same day or tomorrow or some other month, Costly Cannot afford, Phone Cut, Half Call.Call again, Not Interested, Inquired by mistake, Joined Somewhere else, Other

Opens: `/fitness-center/customer/Customer-{id}/` · `/fitness-center/customer/folloup-history/Customer-{id}/` · `/fitness-center/customer/basic-information/Customer-{id}/`

### Members › Other Branch Members

`/merchant/fitness-centers/other-branch-member/`

Headings: Other Branch Member
Columns: Customer Name | Phone Number | Customer ID | Home Fitness Center | Total Sessions | Pending Session Count | Consumed Session Count
Actions: Reset Password · Log Out · Search

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **Other Branch Member**
  - Search By Member Phone No. · `search_list` · text
- [button] Search

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

## Analysis

### Analysis › Traffic Analysis

`/gym-traffic/`

Headings: Traffic Insights · Total Check-ins · Traffic Stats ( September 08, 2026 - October 08, 2026 ) · Traffic at different parts of the day ( September 08, 2026 - October 08, 2026 ) · Traffic by Gender ( September 08, 2026 - October 08, 2026 ) · Traffic by Age Group ( September 08, 2026 - October 08, 2026 ) · Traffic by Level ( September 08, 2026 - October 08, 2026 ) · Weekly Data ( Oct. 5, 2026 - Oct. 11, 2026 )
Columns: Present Check-ins | Present Check-ins Men | Present Check-ins Women | Present Check-ins Other | Current Traffic Rate | Total Traffic | Total Unique Check-ins | Average Check-ins
Columns: Morning | Afternoon | Evening | Late Night
Columns: Male | Female | Other
Columns: Age Group | Total | Male | Female | Other
Columns: Level | Total | Male | Female | Other
Columns: Day | Total | Male | Female | Other | Gender Not Specified
Actions: Reset Password · Log Out ·  Traffic Filter

Form 2:
- [button] x
- **Filters**
- **Filter**
- **Traffic by Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Total Others · `gender_filter` · checkbox
- **Checkins by Age**
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
- **Checkins by Level**
  - Beginner · `member_level` · checkbox
  - Intermediate · `member_level` · checkbox
  - Advanced · `member_level` · checkbox
- [button] Close
- [button] Apply
- **Traffic Insights**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
- [button]  Traffic Filter

Form 3:
- **Total Check-ins**
- **[row value]**
- **[row value]**
- **... repeated once per row (6 rows on the page)**

Form 4:
- **Weekly Data ( Oct. 5, 2026 - Oct. 11, 2026 )**
  - `week_select` · select · options: Current Week, Last Week
- **Total Check-ins**

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Total Others · `gender_filter` · checkbox
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
  - Beginner · `member_level` · checkbox
  - Intermediate · `member_level` · checkbox
  - Advanced · `member_level` · checkbox

Opens: `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&gender_filter=male` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&gender_filter=female` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&gender_filter=other` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&morn_chk=1` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&aftrnoon_chk=1` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&evn_chk=1` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&age_member=18-24` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&age_member=18-24&gender_filter=male` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&age_member=18-24&gender_filter=female` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&age_member=18-24&gender_filter=other` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&age_member=25-34` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&age_member=25-34&gender_filter=male` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&age_member=25-34&gender_filter=female` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&age_member=25-34&gender_filter=other` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&age_member=35-44` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&age_member=35-44&gender_filter=male` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&age_member=35-44&gender_filter=female` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&age_member=35-44&gender_filter=other` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&age_member=45-54` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&age_member=45-54&gender_filter=male` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&age_member=45-54&gender_filter=female` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&age_member=45-54&gender_filter=other` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&age_member=55-64` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&age_member=55-64&gender_filter=male` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&age_member=55-64&gender_filter=female` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&age_member=55-64&gender_filter=other` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&member_level=1` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&member_level=1&gender_filter=male` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&member_level=1&gender_filter=female` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&member_level=1&gender_filter=other` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&member_level=2` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&member_level=2&gender_filter=male` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&member_level=2&gender_filter=female` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&member_level=2&gender_filter=other` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&member_level=3` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&member_level=3&gender_filter=male` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&member_level=3&gender_filter=female` · `/merchant/fitness-center/customers/traffic/?is_apply_filer=1&start_date={id}-09-08 00:00:00&end_date={id}-10-08 23:59:59&member_level=3&gender_filter=other`

### Analysis › Members Analysis

`/gym-members-report/`

Headings: Member Insights · New Active Members (Monthly) · All Active Members (Month-wise) · Members Status · Members by Gender · Members by Age Group · Members by Level
Columns: Members | Live Members | Bounced Members | New Members (Added in Last 30 Days) | Total | Male | Female | 0-7 Days | 0-15 Days | 0-30 Days | More than 30 Days
Columns: Active Members(Regular Checkins) | Inactive Members | Never Checked In | Total | Male | Female
Columns: Male | Female
Columns: Age group | Total | Male | Female
Columns: Level | Total | Male | Female
Cards: January - # · February - # · March - # · April - # · May - # · June - # · July - # · August - # · September - # · October - # · November - # · December - #
Actions: Reset Password · Log Out · Submit

Form 2:
- **Member Insights**
- [button] Submit
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)

Form 3:
- **Members Status**
- **Members by Gender**
- **Members by Age Group**
- **Members by Level**

Other fields:
  - `yearDropdown` · select · options: 2021, 2022, 2023, 2024, 2025, 2026, 2027

Opens: `/merchant/fitness-centers/customers/?is_apply_filer=3&sub_status=AC&start_date={id}-09-08&end_date={id}-10-08`

### Analysis › Enquiry FollowUp Stage Analysis

`/gym-enquiry-report/`

Headings: Enquiry Insights · Enquiry Status · Enquiry by Gender · Enquiry by Age Group · Enquiry by Level
Columns: Enquiry | Under Followup Stage | Under Trial Stage | Under Expected Stage | New Enquiries ( 30 Days ) | Total | Male | Female
Columns: Under Followup Stage | Under Trial Stage | Under Expected Stage | Total | Male | Female
Columns: Male | Female
Columns: Age group | Total | Male | Female
Columns: Level | Total | Male | Female
Actions: Reset Password · Log Out · Submit

Form 2:
- **Enquiry Insights**
- [button] Submit
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)

Form 3:
- **Enquiry Status**
- **Enquiry by Gender**
- **Enquiry by Age Group**
- **Enquiry by Level**

### Analysis › Collection Analysis

`/gym-collection-analysis/`

Headings: CollectionsInsights · This v/s That Comparision · This · That · Collection Analysis (July 08, 2026 - October 08, 2026) · Collections · Mode of Payments ( July 08, 2026 - October 08, 2026 ) · Mode Of Promotion ( July 08, 2026 - October 08, 2026 )
Columns: Services | New Membership | Renewal | Total
Columns: CASH | ONLINE | CHEQUE | Credit Card | NEFT | Debit Card | Paytm | Google PAY | PhonePay | Fitternity | Pay Later | Payed App | Free | PayPal | Razorpay | Forte | Cyber Source | CC Avenue | Stripe Recurring | Pay U | IDFC S | IDFC K | HDFC | Save In | UPI | Tabby | Tabby Card | Postpay | Tamara
Columns: Google Ads | Facebook | Instagram | Word Of Mouth | Unknown | Banner | Walk In | Passing By | Member Refernce | Poster | SMS | Website | Flyer | Hoarding | Phone | Other | Just Dial | WhatsApp Marketing | Hotel Guest | DB1 | DB2 | DB3 | DB4 | DB5 | Enquiry QR or Link
Filter labels: From · Select Client Rep
Actions: Reset Password · Log Out · Submit

Form 2:
- **CollectionsInsights**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)

Form 3:
- **This v/s That Comparision**
- **This**
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `staff_this` · select · options: {15 people/records}
- **That**
  - `end_picker_date_that` · text
  - `start_picker_date_that` · text
  - `staff_that` · select · options: {15 people/records}
- [button] Submit
- **Collection Analysis (July 08, 2026 - October 08, 2026)**
- **Collections**
- **[row value]**
- **... repeated once per row (6 rows on the page)**

Opens: `/merchant/fitness-center/customers/collection-register/?gym_new=1&start_date={id}-07-08 00:00:00&end_date={id}-10-08 23:59:59` · `/merchant/fitness-center/customers/collection-register/?gym_ren=1&start_date={id}-07-08 00:00:00&end_date={id}-10-08 23:59:59` · `/merchant/fitness-center/customers/collection-register/?pt_new=1&start_date={id}-07-08 00:00:00&end_date={id}-10-08 23:59:59` · `/merchant/fitness-center/customers/collection-register/?pt_ren=1&start_date={id}-07-08 00:00:00&end_date={id}-10-08 23:59:59`

### Analysis › Subscriptions Analysis

`/gym-subscription-analysis/`

Headings: SubscriptionsInsights · Subscriptions Analysis Year (2026) · The below amounts are based on the billing amount and billing date. · Total -42.3, PT -7.9, GYM -34.4 · Membership Plan Subscriptions Insights (According to Invoice date)
Columns: Membership Name | Subscriptions | Active | Pending | Inactive | Billing | Amount Received | Balance
Filter labels: Invoice Date To · Invoice Date From · Client Rep. · Gender
Cards: January # · February # · March # · April # · May # · June # · July # · August # · September # · October # · November # · December # · Max Subscriptions Of Month In Year · Average Subscriptions Per Month
Actions: Reset Password · Log Out · Search

Form 2:
- **SubscriptionsInsights**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)

Form 3:
- **Subscriptions Analysis Year (2026)**
  - `stats_year` · number · default 2026
- [button] Go!
- **The below amounts are based on the billing amount and billing date.**
- **Total -#.3, PT -7.9, GYM -34.4**
- [button] Search
  - `end_picker_date` · text
  - `start_picker_date` · text
  - Client Rep. · `client_rep_select` · select · options: {15 people/records}
  - `gender_select` · select · options: All, Male, Female
- **Membership Plan Subscriptions Insights (According to Invoice date)**

### Analysis › Follow up Analysis

`/followup-analysis/`

Headings: Follow Up Analysis Welcome, [person] · Followup Status Group ( October 08, 2026 - October 08, 2026 ) · Total Follow ups · Followup Type Group ( October 08, 2026 - October 08, 2026 ) · Followup Status Group (All Members) · Total Follow ups!
Columns: Open Follow Ups | Successful Follow ups | Not Interested | Follow Ups Done | Total Follow ups
Columns: Enquiry | Balance Due | Membership Renewal | Birthday | Anniversary | Feedback | Freeze | Measurement | PT Renewal | Irregular | Trial | OTHER | Commitment | Total Follow ups
Columns: Staff Name | Open Follow Ups | Successful Follow ups | Not Interested | Follow Ups Done | Total Follow ups
Filter labels: Assign To/Client Rep. · From
Actions: Reset Password · Log Out · Search

Form 2:
- **Follow Up Analysis Welcome, [person]**
  - Assign To/Client Rep. · `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Assign To/Client Rep. · `staff_assign_select` · select · options: {15 people/records}
  - `end_picker_date` · text
  - `start_picker_date` · text
- [button] Search
- **Followup Status Group ( October 08, 2026 - October 08, 2026 )**
- **Total Follow ups**
- **Followup Type Group ( October 08, 2026 - October 08, 2026 )**
- **Total Follow ups**
- **Followup Status Group (All Members)**
- **Total Follow ups!**

### Analysis › Conversion Analysis

`/conversion-analysis/`

Headings: Over All Conversion Analysis · Over All Enquiry to Member Conversion Ratio · Conversion monthwise graphYear (2026) · This v/s That Comparision · This · That · Conversion Analysis · Conversion source Analysis · Conversion Source Analysis · Conversion Followup Analysis
Columns: Month | Total Enquiries | Conversions Done (in same month) | Overall Conversions Done | Total Conversions Done(Gym) | Conversions % (GYM) | Total Conversions Done(PT)
Columns: Total Conversions | Male Conversions | Female Conversions
Columns: Google Ads | Facebook | Instagram | Word of Mouth | Unkown | Banner | Walk In | Passing By | Member Referral | Poster | SMS | Website | Flyers | Hoarding | Phone | Just Dial | WhatsApp Marketing | Other
Columns: 0-1 | 2-5 | 6-10 | Above 10
Filter labels: From · Select Client Rep
Actions: Reset Password · Log Out · Submit

Form 2:
- **Over All Conversion Analysis**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)

Form 3:
- **Conversion monthwise graphYear (2026)**
  - `stats_year` · number · default 2026
- [button] Go!

Form 4:
- **This v/s That Comparision**
- **This**
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `staff_this` · select · options: {15 people/records}
- **That**
  - `end_picker_date_that` · text
  - `start_picker_date_that` · text
  - `staff_that` · select · options: {15 people/records}
- [button] Submit
- **Conversion Analysis**
- **Conversion Analysis**
- **Conversion source Analysis**
- **Conversion Source Analysis**
- **Conversion Followup Analysis**
- **Conversion Followup Analysis**

### Analysis › Enquiry Analysis

`/enquiry-analysis/`

Headings: Enquiry Analysis · Average Enquiries Per Month · Enquiry monthwise graphYear (2026) · This v/s That Comparision · This · That · Enquiry Gender Analysis · Enquiry source Analysis · Enquiry Source Analysis · Enquiry Conversions From Enquiries · Enquiry Followup Analysis · Enquiry Location Analysis
Columns: Enquiry
Columns: Total Enquiries | Open Enquiries | Not interested Enquiries | Male | Female | Other
Columns: Total Enquiries | Male Enquiries | Female Enquiries
Columns: Google Ads | Facebook | Instagram | Word of Mouth | Unkown | Banner | Walk In | Passing By | Member Referral | Poster | SMS | Website | Flyers | Hoarding | Phone | Just Dial | WhatsApp Marketing | Other
Columns: 0-1 | 2-5 | 6-10 | Above 10
Columns: Location | Enquiry Count
Filter labels: From · Select Client Rep
Cards: January # · February # · March # · April # · May # · June # · July # · August # · September # · October # · November # · December #
Actions: Reset Password · Log Out · Submit

Form 2:
- **Enquiry Analysis**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)

Form 3:
- **Enquiry monthwise graphYear (2026)**
  - `stats_year` · number · default 2026
- [button] Go!

Form 4:
- **This v/s That Comparision**
- **This**
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `staff_this` · select · options: {15 people/records}
- **That**
  - `end_picker_date_that` · text
  - `start_picker_date_that` · text
  - `staff_that` · select · options: {15 people/records}
- [button] Submit
- **Enquiry Gender Analysis**
- **Enquiry Gender Analysis**
- **Enquiry source Analysis**
- **Enquiry Source Analysis**
- **Enquiry Conversions From Enquiries**
- **Enquiry Conversions From Enquiries**
- **Enquiry Followup Analysis**
- **Enquiry Followup Analysis**
- **Enquiry Location Analysis**
- **Enquiry Location Analysis**

Opens: `/merchant/fitness-center/customers/enquiry-list/?is_apply_filer=SCREEN&lead_status=NOT_INTERESTED&start_date={id}-01-01&end_date={id}-10-08` · `/merchant/fitness-center/customers/follow-up-list-new/?is_apply_filer=1&client_select=enquiry&start_date={id}-09-08&end_date={id}-09-23` · `/merchant/fitness-center/customers/follow-up-list-new/?is_apply_filer=1&client_select=enquiry&start_date={id}-08-09&end_date={id}-09-08` · `/merchant/fitness-center/customers/follow-up-list-new/?is_apply_filer=1&client_select=enquiry&start_date={id}-07-10&end_date={id}-08-09` · `/merchant/fitness-center/customers/follow-up-list-new/?is_apply_filer=1&client_select=enquiry&start_date={id}-01-01&end_date={id}-07-10` · `/merchant/fitness-center/customers/enquiry-list/?is_apply_filer=SCREEN&lead_status=NEW_ENQUIRY&start_date={id}-09-08&end_date={id}-10-08` · `/merchant/fitness-center/client-database/?is_apply_filer=SCREEN&client_type=Enquiry&gender_filter=male&start_date={id}-01-01&end_date={id}-10-08` · `/merchant/fitness-center/client-database/?is_apply_filer=SCREEN&client_type=Enquiry&gender_filter=female&start_date={id}-01-01&end_date={id}-10-08` · `/merchant/fitness-center/client-database/?is_apply_filer=SCREEN&client_type=Enquiry&gender_filter=other&start_date={id}-01-01&end_date={id}-10-08` · `/merchant/fitness-center/customers/enquiry-list/?is_apply_filer=SCREEN&lead_status=NEW_ENQUIRY&gender_filter=male&start_date={id}-01-01&end_date={id}-10-08` · `/merchant/fitness-center/customers/enquiry-list/?is_apply_filer=SCREEN&lead_status=NEW_ENQUIRY&gender_filter=female&start_date={id}-01-01&end_date={id}-10-08` · `/merchant/fitness-center/customers/enquiry-list/?is_apply_filer=SCREEN&lead_status=NEW_ENQUIRY&gender_filter=other&start_date={id}-01-01&end_date={id}-10-08` · `/merchant/fitness-center/customers/enquiry-list/?is_apply_filer=SCREEN&lead_status=NOT_INTERESTED&gender_filter=male&start_date={id}-01-01&end_date={id}-10-08` · `/merchant/fitness-center/customers/enquiry-list/?is_apply_filer=SCREEN&lead_status=NOT_INTERESTED&gender_filter=female&start_date={id}-01-01&end_date={id}-10-08` · `/merchant/fitness-center/customers/enquiry-list/?is_apply_filer=SCREEN&lead_status=NOT_INTERESTED&gender_filter=other&start_date={id}-01-01&end_date={id}-10-08`

### Analysis › Enquiry Conversion Report

`/staff-conversion-analysis/`

Headings: Conversion Analysis · Enquiry Conversion Report
Columns: Emp Name | Total Enquiry | Total Conv | Total Subscriptions Sale Units | Total Subscriptions Sale Units PT | Total Subscriptions Sale Units GYM | Total Sale Amt | Received Amt | Bal Amt | Total
Filter labels: From
Actions: Reset Password · Log Out · Submit

Form 2:
- **Conversion Analysis**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)

Form 3:
- **Enquiry Conversion Report**
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text

### Analysis › Expense Analysis

`/gym-expense-analysis/`

Headings: ExpenseInsights · Expense Analysis Year (2026) · Average Expense Data Expense Insights · Month-wise Expense Breakdown Expense Insights · This v/s That Comparison · This (January 01, 2026 - December 31, 2026) · That (January 01, 2026 - December 31, 2026) · Expense Amount Analysis January 01, 2026 - December 31, 2026 · Total Expense Analysis · Salary Expense Analysis January 01, 2026 - December 31, 2026 · Salary Expense · Staff Expense Analysis January 01, 2026 - December 31, 2026
Columns: January | February | March | April | May | June | July | August | September | October | November | December
Columns: Yearly per month Avg Count:0 | Q1 Monthly Avg Count:0 | Q2 Monthly Avg Count:0 | Q3 Monthly Avg Count:0 | Q4 Monthly Avg Count:0
Columns: Salary Expenses | Vendor Expenses | Total Expenses
Columns: Salary Expenses | Vendor Expenses | Total Expenses Amount
Columns: Trainer | Staff | Total Salary Expenses
Columns: Gym Owner | Floor Manager | Gym Sales | Helper | Receptionist | Manager
Columns: Head Trainer/Nutritionist | Personal Trainer | General Trainer | doctor | Zumba Instructor | Coach | Nutritionist | Massage Therapist | Fitness Manager | Yoga Instructor | Dietition | Counsellor | Dance Choreographer | MMA Professional | Music Instructor | Physiotherapy | Psychology | S C Coach | Pilates Teacher | Freelancer
Columns: Expenses | Non Register Vendor
Filter labels: From
Cards: #
Actions: Reset Password · Log Out · Submit

Form 2:
- **ExpenseInsights**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)

Form 3:
- **Expense Analysis Year (2026)**
  - `stats_year` · number · default 2026
- [button] Go!
- **Average Expense Data Expense Insights**
- **Month-wise Expense Breakdown Expense Insights**

Form 4:
  - From · `stats_year` · number · default 2026
- **This v/s That Comparison**
- **This (January 01, 2026 - December 31, 2026)**
  - `start_picker_date` · text
  - `end_picker_date` · text
- **That (January 01, 2026 - December 31, 2026)**
  - `start_picker_date_that` · text
  - `end_picker_date_that` · text
- [button] Submit
- **Expense Amount Analysis January #, 2026 - December 31, 2026**
- **Total Expense Analysis**
- **Expense Amount Analysis January #, 2026 - December 31, 2026**
- **Total Expense Analysis**
- **Salary Expense Analysis January 01, 2026 - December 31, 2026**
- **Salary Expense**
- **Salary Expense Analysis January 01, 2026 - December 31, 2026**
- **Salary Expense**
- **Staff Expense Analysis January 01, 2026 - December 31, 2026**
- **Staff Expense**
- **Staff Expense Analysis January 01, 2026 - December 31, 2026**
- **Staff Expense**
- **Trainer Expense Analysis January 01, 2026 - December 31, 2026**
- **Trainer Expense**
- **Trainer Expense Analysis January 01, 2026 - December 31, 2026**
- **Trainer Expense**
- **Vendor Wise Analysis January 01, 2026 - December 31, 2026**
- **Vendor Wise Analysis**
- **Vendor Wise Analysis January 01, 2026 - December 31, 2026**
- **Vendor Wise Analysis**

### Analysis › Profit & Loss Analysis

`/profit-loss-analysis/`

Headings: Profit & Loss Insights · Profit & Loss Analysis Year (2026) · Profit & Loss Breakdown Profit & Loss Insights · Total Collection Breakdown Collection Insights · Total Expense Breakdown Expense Insights
Columns: Collection | January | February | March | April | May | June | July | August | September | October | November | December
Columns: Expenses | January | February | March | April | May | June | July | August | September | October | November | December
Cards: #
Actions: Reset Password · Log Out

Form 2:
- **Profit & Loss Insights**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)

Form 3:
- **Profit & Loss Analysis Year (2026)**
  - `stats_year` · number · default 2026
- [button] Go!
- **Profit & Loss Breakdown Profit & Loss Insights**
- **Total Collection Breakdown Collection Insights**
- **Total Expense Breakdown Expense Insights**

### Analysis › Billing Analysis

`/merchant/fitness-center/customers/payments-graph/`

Headings: Billing Analysis · Collection Report (October 01, 2026 - October 31, 2026) · Collections · Source Of Promotion ( October 01, 2026 - October 31, 2026 ) · Mode of Payments (October 01, 2026 - October 31, 2026) · Membership Plan Subscriptions Insights (According to Invoice date) · Bills According to Bill Rep (October 01, 2026 - October 31, 2026) · Bills According to Bill Rep · Target Analysis · Bills According to Client Rep (October 01, 2026 - October 31, 2026) · Bills According to Client Rep · Bills Created By (October 01, 2026 - October 31, 2026)
Columns: Services | New Membership | Renewal | Total
Columns: Google Ads | Facebook | Instagram | Word Of Mouth | Unknown | Banner | Walk In | Passing By | Member Refernce | Poster | SMS | Website | Flyer | Hoarding | Phone | Other | Just Dial | WhatsApp Marketing | Hotel Guest | DB1 | DB2 | DB3 | DB4 | DB5 | Enquiry QR or Link
Columns: CASH | ONLINE | CHEQUE | Credit Card | NEFT | Debit Card | Paytm | Google PAY | PhonePay | Fitternity | PayPal | Payed App | Razorpay | Pay Later | Forte | Cyber Source | CC Avenue | Stripe Recurring | Pay U | Free | IDFC S | IDFC K | HDFC | Save In | UPI | Tabby | Tabby Card | Postpay | Tamara
Columns: Membership Name | Subscriptions | Active | Pending | Inactive | New | Renewal | Total Paid | Total Bill Amount
Columns: Staff Name | PT Renewal | PT New | Gym Renewal | Gym New | Total Collection
Columns: Staff/Trainer | Target Type | Total Achieved | Target Achieved | Target 1 | Target 2 | Target 3 | Target 4 | Target 5
Columns: Staff Name | PT Renewal | PT New | Gym Renewal | Gym New | Total Amount
Filter labels: From
Actions: Reset Password · Log Out · Submit · Balance Amount : 0 · View

Form 2:
- **Billing Analysis**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
- [button] x
- **Send SMS**
- **SMS Body**
  - Keep your SMS short. · `text_sms_body` · textarea
- [button] Send SMS
- [button] Cancel
  - `membership_plan` · select · options: {64 people/records}
  - `services` · select · options: Select Service, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
  - `created_by` · select · options: {15 people/records}
  - `pay_method` · select · options: Select Payment Mode, CASH, ONLINE, Credit Card, Debit Card, PAYTM, Cheque, NEFT, Google Pay, PhonePay, Fitternity, PayPal, RazorPay, Pay Later, Forte, Cyber Source, CC Avenue, Stripe Recurring, Pay U, Free, IDFC S, IDFC K, HDFC, Save In, UPI … (+4)
  - `pay_status` · select · options: Status, Paid, Cancel
  - `client_rep` · select · options: {15 people/records}
  - `gender_filter` · select · options: Gender, Male, Female, Other
  - `sub_status` · select · options: Subscription Status, Active, Pending, Expired
  - `batch_filter` · select · options: Batch List, 5:00 AM - 6:30 AM, 5:30 AM - 7:00 AM, 6:00 AM - 7:30 AM, 6:30 AM - 8:00 AM, 7:00 AM - 8:30 AM, 7:30 AM - 9:00 AM, 8:00 AM - 9:30 AM, 8:30 AM - 10:00 AM, 9:00 AM - 10:30 AM, 9:30 AM - 11:00 AM, 10:00 AM - 11:30 AM, 8:00 PM - 9:30 PM, 10:30 AM - 12:00 PM, 5:00 PM - 6:30 PM, 5:30 PM - 7:00 PM, 6:00 PM - 7:30 PM, 6:30 PM - 8:00 PM, 7:00 PM - 8:30 PM, 7:30 PM - 9:00 PM, 8:30 PM - 10:00 PM, 4:30 PM - 6:00 PM, 2:00 PM - 3:30 PM, 2:30 PM - 4:00 PM, 3:00 PM - 4:30 PM … (+2)
  - `start_picker_date` · text
  - `end_picker_date` · text
- [button] Submit
- **Collection Report (October 01, 2026 - October 31, 2026)**
- **Collections**
- **[row value]**
- **... repeated once per row (3 rows on the page)**

Pop-up: **Send SMS** — buttons: Send SMS, Cancel
  - Keep your SMS short. · `text_sms_body` · textarea

Opens: `/merchant/fitness-center/customers/collection-register/?gym_new=1&start_date={id}-10-01 00:00:00&end_date={id}-10-31 23:59:59` · `/merchant/fitness-center/customers/collection-register/?gym_ren=1&start_date={id}-10-01 00:00:00&end_date={id}-10-31 23:59:59` · `/merchant/fitness-center/customers/collection-register/?pt_new=1&start_date={id}-10-01 00:00:00&end_date={id}-10-31 23:59:59` · `/merchant/fitness-center/customers/collection-register/?pt_ren=1&start_date={id}-10-01 00:00:00&end_date={id}-10-31 23:59:59`

### Analysis › Sales Leaderboard

`/sales-leaderboard/`

Headings: Sales Leaderboard · Bills According to Bill Rep (October 01, 2026 - October 31, 2026) · Bills According to Bill Rep · Bills According to Client Rep (October 01, 2026 - October 31, 2026) · Bills According to Client Rep
Columns: Staff Name | PT Renewal | PT New | Gym Renewal | Gym New | Highest Target Assigned | Total Collection (Target Achieved) | Target Achieved (%)
Columns: Staff Name | PT Renewal | PT New | Gym Renewal | Gym New | Total Amount
Filter labels: From
Actions: Reset Password · Log Out · Submit · Balance Amount : 0

Form 2:
- **Sales Leaderboard**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
- [button] x
- **Send SMS**
- **SMS Body**
  - Keep your SMS short. · `text_sms_body` · textarea
- [button] Send SMS
- [button] Cancel
  - `membership_plan` · select · options: {64 people/records}
  - `services` · select · options: Select Service, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
  - `created_by` · select · options: {15 people/records}
  - `pay_method` · select · options: Select Payment Mode, CASH, ONLINE, Credit Card, Debit Card, PAYTM, Cheque, NEFT, Google Pay, PhonePay, Fitternity, PayPal, RazorPay, Pay Later, Forte, Cyber Source, CC Avenue, Stripe Recurring, Pay U, Free, IDFC S, IDFC K, HDFC, Save In, UPI … (+4)
  - `pay_status` · select · options: Status, Paid, Cancel
  - `client_rep` · select · options: {15 people/records}
  - `gender_filter` · select · options: Gender, Male, Female, Other
  - `sub_status` · select · options: Subscription Status, Active, Pending, Expired
  - `batch_filter` · select · options: Batch List, 5:00 AM - 6:30 AM, 5:30 AM - 7:00 AM, 6:00 AM - 7:30 AM, 6:30 AM - 8:00 AM, 7:00 AM - 8:30 AM, 7:30 AM - 9:00 AM, 8:00 AM - 9:30 AM, 8:30 AM - 10:00 AM, 9:00 AM - 10:30 AM, 9:30 AM - 11:00 AM, 10:00 AM - 11:30 AM, 8:00 PM - 9:30 PM, 10:30 AM - 12:00 PM, 5:00 PM - 6:30 PM, 5:30 PM - 7:00 PM, 6:00 PM - 7:30 PM, 6:30 PM - 8:00 PM, 7:00 PM - 8:30 PM, 7:30 PM - 9:00 PM, 8:30 PM - 10:00 PM, 4:30 PM - 6:00 PM, 2:00 PM - 3:30 PM, 2:30 PM - 4:00 PM, 3:00 PM - 4:30 PM … (+2)
  - `start_picker_date` · text
  - `end_picker_date` · text
- [button] Submit
- **Bills According to Bill Rep (October 01, 2026 - October 31, 2026)**
- **Bills According to Bill Rep**
- **Bills According to Client Rep (October 01, 2026 - October 31, 2026)**
- **Bills According to Client Rep**

Pop-up: **Send SMS** — buttons: Send SMS, Cancel
  - Keep your SMS short. · `text_sms_body` · textarea

### Analysis › Daily Collection Analysis

`/daily-collection-analysis/`

Headings: Daily Collection Report (October 01, 2026 - October 31, 2026) · Total Summary October 2026 · Daily Collection Report October 2026
Columns: Total New Enquiries Added | Total Open Enquiries | Total Client Converted | Total New Amount Received | Total Renewal Amount Received | (Gym-New) | (PT-New) | (Gym) | (PT)
Columns: Date | Total NewEnquiries Added | Total Billing Amount | Total Amount Received | Spot Client Conversion | Total Client Converted | Total New Amount Received | Total Renewal Amount Received | View | (Gym-New) | (PT-New) | (Gym) | (PT)
Actions: Reset Password · Log Out · Search · Click Here to Generate a report in PDF · Export to CSV

Form 2:
- **Daily Collection Report (October 01, 2026 - October 31, 2026)**
- [button] Search
  - `stats_year` · number · default 2026
  - `month_picker` · select · options: January, February, March, April, May, June, July, August, September, October, November, December

Form 3:
- **Total Summary October #**
- **Daily Collection Report October 2026**

Other fields:
  - `created_by` · select · options: {7 people/records}
  - `bill_rep` · select · options: {23 people/records}

Opens: `/export_daily_collection_analysis_to_pdf/?stats_year={id}&month_picker=October` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-01 00:00:00&end_date={id}-10-01 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-02 00:00:00&end_date={id}-10-02 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-03 00:00:00&end_date={id}-10-03 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-04 00:00:00&end_date={id}-10-04 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-05 00:00:00&end_date={id}-10-05 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-06 00:00:00&end_date={id}-10-06 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-07 00:00:00&end_date={id}-10-07 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-08 00:00:00&end_date={id}-10-08 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-09 00:00:00&end_date={id}-10-09 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-10 00:00:00&end_date={id}-10-10 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-11 00:00:00&end_date={id}-10-11 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-12 00:00:00&end_date={id}-10-12 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-13 00:00:00&end_date={id}-10-13 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-14 00:00:00&end_date={id}-10-14 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-15 00:00:00&end_date={id}-10-15 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-16 00:00:00&end_date={id}-10-16 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-17 00:00:00&end_date={id}-10-17 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-18 00:00:00&end_date={id}-10-18 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-19 00:00:00&end_date={id}-10-19 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-20 00:00:00&end_date={id}-10-20 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-21 00:00:00&end_date={id}-10-21 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-22 00:00:00&end_date={id}-10-22 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-23 00:00:00&end_date={id}-10-23 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-24 00:00:00&end_date={id}-10-24 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-25 00:00:00&end_date={id}-10-25 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-26 00:00:00&end_date={id}-10-26 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-27 00:00:00&end_date={id}-10-27 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-28 00:00:00&end_date={id}-10-28 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-29 00:00:00&end_date={id}-10-29 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-30 00:00:00&end_date={id}-10-30 23:59:59` · `/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-31 00:00:00&end_date={id}-10-31 23:59:59`

### Analysis › PT Analysis

`/pt-analysis/`

Headings: PT AnalysisInsights · PT Subscriptions · Active PT SubscriptionsGender Basis · Trainer PT Analysis · Deactivated Trainer PT Analysis
Columns: PT Subscriptions
Columns: Total | Active | Inactive | Male | Female | Other
Columns: Trainer Name | Total | Total Active | Total Inactive | 118 | 0 | 34
Columns: Trainer Name | Total | Total Active | Total Inactive | 3 | 0 | 1
Actions: Reset Password · Log Out

Form 2:
- **PT AnalysisInsights**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - `trainer_list` · select · options: {17 people/records}

Form 3:
- **PT Subscriptions**
- **Active PT SubscriptionsGender Basis**
- **Trainer PT Analysis**
- **Deactivated Trainer PT Analysis**

Opens: `/merchant/fitness-center/customers/expiry-membership-resgister/?start_datee= 2&screen_type=SCREEN&trainer_id=&start_date={id}-09-23&end_date={id}-10-08` · `/merchant/fitness-center/customers/expiry-membership-resgister/?start_datee= 2&screen_type=SCREEN&trainer_id=&start_date={id}-09-08&end_date={id}-09-23` · `/merchant/fitness-center/customers/expiry-membership-resgister/?start_datee= 2&screen_type=SCREEN&trainer_id=&start_date={id}-08-09&end_date={id}-09-08` · `/merchant/fitness-center/customers/expiry-membership-resgister/?start_datee= 2&screen_type=SCREEN&trainer_id=&start_date={id}-07-10&end_date={id}-08-09` · `/merchant/fitness-center/customers/expiry-membership-resgister/?start_datee= 2&screen_type=SCREEN&trainer_id=&start_date={id}-01-01&end_date={id}-07-10` · `/merchant/fitness-center/customers/pt-register/?is_apply_filer=1&sub_status=ALL&trainer_id={id}` · `/merchant/fitness-center/customers/pt-register/?is_apply_filer=1&sub_status=AC&trainer_id={id}` · `/merchant/fitness-center/customers/pt-register/?is_apply_filer=1&sub_status=EX&trainer_id={id}`

### Analysis › Leaderboard

`/tr-sales-leaderboard/`

Headings: Leaderboard(October 01, 2026 - October 31, 2026) · Target Analysis · Leaderboard
Columns: Trainer Name | Sales Target | Target Type | Target Achieved | Achieved (%) | Sales Achieved | View
Columns: Trainer Name | Sales Achieved | PT Renewal | PT New | Gym Renewal | Gym New | View
Actions: Reset Password · Log Out · Search

Form 2:
- **Leaderboard(October 01, 2026 - October 31, 2026)**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)

Form 3:
- **Target Analysis**
- **Leaderboard**

Other fields:
  - `month_picker` · select · options: January, February, March, April, May, June, July, August, September, October, November, December
  - `stats_year` · number · default 2026

Opens: `/merchant/fitness-center/customers/collection-register-daily/?bill_rep={id}&start_date={id}-10-01 00:00:00&end_date={id}-10-31 23:59:59`

### Analysis › Revenue Forecast

`/revenue-forecast/`

Headings: Revenue Forecast · Renewal breakdown category wise
Columns: Month | Total Expected Amount | Total Renewal Amount | Total Balance Amount
Columns: Month | Weight Training | Cardio | Cross-fit | Personal Training / Nutrition | Calisthenics | HIIT | Strength Training | Group Activity | Nutrition | Steam | Locker | Free Body Weight | Total
Actions: Reset Password · Log Out

Other fields:
  - `category_type` · select · options: Select Category, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
  - `created_by` · select · options: {7 people/records}

### Analysis › Weight Loss Analysis

`/merchant/fitness-center/measurement_list/`

Headings: Client Weight Loss List · Please select a date range to see the results
Filter labels: Created Date · Source of Promotion · Employment Type · Lead Type · Client Rep · Batch List · Gender · Client Type · Assigned Coach · Challenges
Actions: Reset Password · Log Out · Search · Export to CSV · Submit

Form 2:
- [button] x
- **Filters**
- **Enquiries**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Lead Status**
  - Open Enquiry · `lead_status` · checkbox
  - Not Interested · `lead_status` · checkbox
- **Members by Age**
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
- **Lead Type**
  - Hot / Expected · `lead_type` · checkbox
  - Warm / May be · `lead_type` · checkbox
  - Cold / Not so interested · `lead_type` · checkbox
- [button] Close
- [button] Apply
- **Client Weight Loss List**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Mobile Number or Email Address · `search_list` · text
- [button] Search
- [button] Export to CSV
- [button] Submit
  - `source_promo` · select · options: All, Unknown, GOOGLE ADS, FACEBOOK, INSTAGRAM, WORD OF MOUTH, Banner, Walk In, Passing By, Member Referal, Poster, SMS, Website, Flyers, Hoarding, Just Dial, Hotel Guest, Database 1, Database 2, Database 3, Database 4, Database 5
  - `emp_status` · select · options: All, Unknown, STUDENT, WORKING, NOT WORKING, SELF EMPLOYED, HOUSE WIFE
  - `convert_select` · select · options: All Convertibility, Hot, Warm, Cold, Expected
  - Client Rep · `staff_assign_select` · select · options: {7 people/records}
  - Batch List · `cust_batch_select` · select · options: {27 people/records}
  - `gender_filter` · select · options: All, Male, Female, Other
  - Client Type · `client_type` · select · options: All Clients, Enquiry, Member
  - Assigned Coach · `trainer_assign_select` · select · options: {17 people/records}
  - Challenges · `challenge_id` · select · options: Select challenges, April Anniversary Challenge (03-Apr-2024 to 15-Apr-2024), Demo (28-Nov-2024 to 28-Nov-2024)
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS ENQUIRY ?**
- [button] Yes
- [button] No
- **Please select a date range to see the results**

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Open Enquiry · `lead_status` · checkbox
  - Not Interested · `lead_status` · checkbox
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
  - Hot / Expected · `lead_type` · checkbox
  - Warm / May be · `lead_type` · checkbox
  - Cold / Not so interested · `lead_type` · checkbox

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS ENQUIRY ?** — buttons: No

### Analysis › Lead Source Analysis

`/lead-source-analysis/`

Headings: Lead Source AnalysisListing
Columns: Lead Source | Total Enquiries | Open Enquiries | Not Intrested Enquiries | Spot Conversion | Followup Conversion | Total Conversion | Percentage Conversion | Conversion Base Price | Conversion Sale Price
Filter labels: From
Actions: Reset Password · Log Out · Submit · Export to CSV

Form 2:
- **Lead Source AnalysisListing**
  - To · `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)

Form 3:
- [button] Submit
  - To · `dropdown` · select · options: Last 30 Days (08 September 2026 - 08 October 2026), Custom (08 September 2026 - 08 October 2026)
  - `end_picker_date` · text
  - `start_picker_date` · text
- [button] Export to CSV

### Analysis › Branch Analysis

`/merchant/fitness-center/multi-branch-analysis/`

Headings: Branch Analysis Listing
Columns: Branch Name | Area | Total Open Enquiries | Today's New Enquiries | Yesterday's New Enquiries | Today's Collection (Paid Amt.) | Yesterday's Collection (Paid Amt.) | Total Collection (Paid Amt.) | Total Balance Amount | Total Billing Amount
Filter labels: From
Actions: Reset Password · Log Out · Submit · Search · Export to Excel · Back · Next

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **Branch Analysis Listing**
- [button] Submit
  - To · `dropdown` · select · options: All Data 📅, Today (08 October 2026 - 08 October 2026), This Month (01 October 2026 - 08 October 2026), Last Month (01 September 2026 - 30 September 2026), Last 3 Days (05 October 2026 - 08 October 2026), Last 7 Days (01 October 2026 - 08 October 2026), Last 15 Days (23 September 2026 - 08 October 2026), Last 30 Days (08 September 2026 - 08 October 2026), Custom (01 October 2026 - 08 October 2026)
  - `end_picker_date` · text
  - `start_picker_date` · text
  - Search by Branch Name or Branch ID · `search_list` · text
- [button] Search
- [button] Export to Excel
- [button] Back
- [button] Next

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

## Memberships

### Memberships › Membership Plans

#### Memberships › Membership Plans › Create Membership Plan

`/fitness-center/membership-plan/basic-information/`

Headings: Membership Plans · Basic Information · Membership category · Assign Trainer · Terms & Condition · Pricing & Duration · Membership Plan Duration · Membership Plan Freeze Days Duration · Class Limiter · Free Trial for New Members · Membership Plan Pricing · Membership Plan Image
Filter labels: Membership Plan Name * · Membership Plan Description · Category* · Show Membership in App · Assign Trainer · Session Count · Show Unlimited Sessions in App · Disable WhatsApp Messages & Follow-up · Terms & Condition · Membership Plan Tenure * · Is One Time · Membership Plan Freeze Days · Weekly class limit · Free Trial · Price · Discounted Price · Total · Membership Plan Sequencing in App · Membership Plan Image · Add a photo · FAQs · Guidelines · Dos and Don'ts · Shopping List · Snack List · Activities · Other Text · Appointment Type
Actions: Reset Password · Log Out · Show Optional Fields · Back · Save & Close · Save

Form 2:
  - Membership Plan Name * · `membership_plan_name` · text · required
- **Membership category**
  - Weight Training (1) · `fitness_category` · checkbox · required
  - Cardio (3) · `fitness_category` · checkbox · required
  - Cross-fit (4) · `fitness_category` · checkbox · required
  - Personal Training / Nutrition (9) · `fitness_category` · checkbox · required
  - Calisthenics (16) · `fitness_category` · checkbox · required
  - HIIT (20) · `fitness_category` · checkbox · required
  - Strength Training (21) · `fitness_category` · checkbox · required
  - Group Activity (71) · `fitness_category` · checkbox · required
  - Nutrition (75) · `fitness_category` · checkbox · required
  - Steam (79) · `fitness_category` · checkbox · required
  - Locker (81) · `fitness_category` · checkbox · required
  - Free Body Weight (1685) · `fitness_category` · checkbox · required
  - Yes · `show_in_app` · radio
  - No · `show_in_app` · radio
- **Assign Trainer**
  - Select All · `check-all` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - Session Count · `pt_session_count` · text
  - `show_unlimited_sessions` · checkbox
  - Yes · `disabled_msg_followup` · radio
  - No · `disabled_msg_followup` · radio
- **Terms & Condition**
- **Pricing & Duration**
- **Membership Plan Duration**
  - Membership Plan Tenure * · `plan_period_units` · number · required
  - `plan_period_length` · select · options: Months, Years, Days
  - Is One Time · `is_one_time` · checkbox
- **Membership Plan Freeze Days Duration**
  - E.g. 3 · `freeze_days_units` · number
  - `freeze_days_length` · select · options: Days
- **Class Limiter**
  - Weekly class limit · `class_limit` · text · required
- **Free Trial for New Members**
  - Free Trial · `is_free_trial` · checkbox
- **Membership Plan Pricing**
  - Is One Time · `plan_price` · number · required
  - Discounted Price · `discount_price` · number
  - `total_price` · number
- [button] Show Optional Fields
  - `membership_plan_seq` · number · required
- **Membership Plan Image**
  - Add a photo · `center_logo` · file
- **Appointment Per Membership**
  - `appointment_type` · select · options: Select An Appointment Type, Daily, Alternate Day, Every Third Day, Once A Week, One Time
- [button] Back
- [button] Save & Close
- [button] Save

#### Memberships › Membership Plans › My Membership Plans

`/merchant/fitness-center/membership-plan/`

Headings: Active Membership plans Listing
Columns: Plan Name | Plan Code | Fitness center | Services | Status | Tenure | Price | Discount Price | Created by | Action
Actions: Reset Password · Log Out · Search · Export to CSV · Deactivate · Import Membership · Deactivated Plans · Create Membership

Form 2:
- **Active Membership plans Listing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
- [button] Export to CSV
- [button] Deactivate
  - `plan_category` · select · options: Select Category, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS MEMBERSHIP PLAN ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE THIS MEMBERSHIP PLAN ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE THIS MEMBERSHIP PLAN ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox
- **Free Trials Memberships**
- **Membership plans (General)**
- **Membership Plans (Personalised)**

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS MEMBERSHIP PLAN ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE THIS MEMBERSHIP PLAN ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE THIS MEMBERSHIP PLAN ?** — buttons: No

Opens: `/fitness-center/membership-plan/Membership-Plan-{id}/` · `/fitness-center/membership-plan/basic-information/Membership-Plan-{id}/`

### Memberships › Subscriptions

`/merchant/fitness-center/customers/subscriptions/`

Headings: SubscriptionsListing
Columns: Invoice No. | Invoice Date | Customer Name | Plan Name | Start Date | End Date | Plan Status | Total Price | Paid Price | Balance Price | Payment Status | Action
Actions: Reset Password · Log Out · Search · Export to CSV ·  Subscriptions Filter · Actions · Follow Up History · Back · Next

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **SubscriptionsListing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
- [button] Export to CSV
- [button]  Subscriptions Filter
  - `check-all-box` · checkbox
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Back
- [button] Next

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

Opens: `/fitness-center/customer/Customer-{id}/` · `/fitness-center/customer/folloup-history/Customer-{id}/0/`

### Memberships › Coupon

#### Memberships › Coupon › Create Coupon

`/fitness-center/customer/coupon-basic-information/`

Headings: Coupon Discounts · Terms & Validations · Payment Installments
Filter labels: Coupon Name * · Coupon Code * · Coupon Type * · Coupon Discount * · Select Fitness Service · Select Membership · Member Id · Who can use this coupon? * · Coupon Start Date · Coupon Expiry · Max Redemtions · Max Redemtions Per Customer · Min Order · Max Order · Max Discount Upto (). · Terms & Conditions · No. of Installments · Intervals · Duration · Interest Rate(% p.a)
Actions: Reset Password · Log Out · Lookup Member code · Back · Save & Close · Save

Form 2:
  - e.g. 30% Off for first 100 memberships · `coupon_name` · text · required
  - e.g. 40FIRST100 · `coupon_code` · text · required
  - `coupon_type` · select · required · options: Flat Value, Percentage Discount, Payment Installments, Flat value & Payment Installments, Percentage Discount & Payment Installments
  - e.g. 40 · `coupon_discount` · number · required
- **Terms & Validations**
  - `fitness_service` · select · options: Select Service, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
  - Select Fitness Service · `membership_plan` · select · options: {24 people/records}
  - Enter Member Code · `cust_id` · text
  - Who can use this coupon? * · `member_type` · select · required · options: {4 people/records}
  - `coupon_start_date` · text
  - `coupon_expiry` · text
  - `max_users` · number
  - `max_per_user` · number
  - in Rupees · `min_order` · number
  - in Rupees · `max_order` · number
  - in Rupees · `max_discount` · number
  - e.g. Valid for new members only. · `terms_conditions` · textarea
- **Payment Installments**
  - `no_of_payments` · select · required · options: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
  - `intervals` · select · required · options: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
  - `duration` · select · required · options: Month, Week, Year
  - `interest_rate` · number · required · default 0
- [button] Back
- [button] Save & Close
- [button] Save

#### Memberships › Coupon › My Coupons

`/fitness-center/customer/coupons-list/`

Headings: Coupon Listing
Columns: Coupon Name | Coupon Code | Coupon Type | Status | Action
Actions: Reset Password · Log Out · Search · Deactivate · Activate · Create Coupon · Back · Next

Form 2:
- **Coupon Listing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
- [button] Deactivate
- [button] Activate
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS COUPON ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE THIS COUPON ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE THIS COUPON ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS COUPON ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE THIS COUPON ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE THIS COUPON ?** — buttons: No

Opens: `/fitness-center/customer/coupon-basic-information/{id}/`

### Memberships › Combo Offer

#### Memberships › Combo Offer › Add Combo Offer

`/merchant/fitness-center/create-combo-offer/`

Headings: Create Combo Offer · Combo Offer Name · Select Plan Category · Select Membership Plan · Hold down "Control", or "Command" on a Mac, to select more than one.
Columns: Plan Name | Fitness center | Services | Status | Tenure | Price | Discount Price | Selling Price | Created by
Actions: Reset Password · Log Out · Combo Offer List · Submit

Form 2:
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS membership plan ?**
- [button] Yes
- [button] No
- **Create Combo Offer**
- **Combo Offer Name**
  - Enter offer name · `combo_offer` · text · required
- **Select Plan Category**
  - `plan_category` · select · options: Select Category, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
- **Select Membership Plan**
  - `membership` · multiselect · options: {23 people/records}
- **Hold down "Control", or "Command" on a Mac, to select more than one.**
- [button] Submit
  - `check-all-box` · checkbox

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS membership plan ?** — buttons: No

#### Memberships › Combo Offer › Combo Offer List

`/merchant/fitness-center/combo-offer-list/`

Headings: Combo OfferListing
Columns: Offer Name | Status | Action
Actions: Reset Password · Log Out · Search · Delete · Create Combo Offer · Active · Edit

Form 2:
- **Combo OfferListing**
  - Search by offer name · `search_list` · text
- [button] Search
- [button] Delete
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS combo offer ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox
- [button] Active

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS combo offer ?** — buttons: No

Opens: `/merchant/fitness-center/edit-combo-offer/{id}/`

## Batches & Classes

### Batches & Classes › Add Batch

`/fitness-center/batch/add-batch/`

Headings: New Batch Basic Information · Assign a Trainer · Service * · Working Days · Timing
Filter labels: Batch Name * · Batch Info · Capacity · Room Name · Batch Banner photo · Conducted by · Services * · Start Date · End Date · Working Days · Start Time * · End Time
Actions: Reset Password · Log Out · Back · Save & Close · Save

Form 2:
  -  Cardio Batch  · `batch_name` · text · required
  - `batch_info` · textarea
  - Batch capacity in digits · `batch_capacity` · number
  -  Room name eg: Seminar Hall  · `batch_room` · text
  - `trainer_pic` · file
- **Assign a Trainer**
  - [person] · `trainer_select` · checkbox · required
  - [person] · `trainer_select` · checkbox · required
  - [person] · `trainer_select` · checkbox · required
  - [person] · `trainer_select` · checkbox · required
  - [person] · `trainer_select` · checkbox · required
  - [person] · `trainer_select` · checkbox · required
  - [person] · `trainer_select` · checkbox · required
  - [person] · `trainer_select` · checkbox · required
  - [person] · `trainer_select` · checkbox · required
  - [person] · `trainer_select` · checkbox · required
  - [person] · `trainer_select` · checkbox · required
  - [person] · `trainer_select` · checkbox · required
  - [person] · `trainer_select` · checkbox · required
  - [person] · `trainer_select` · checkbox · required
  - [person] · `trainer_select` · checkbox · required
  - [person] · `trainer_select` · checkbox · required
- **Service ***
  - Weight Training · `fitness_category` · checkbox · required
  - Cardio · `fitness_category` · checkbox · required
  - Cross-fit · `fitness_category` · checkbox · required
  - Personal Training / Nutrition · `fitness_category` · checkbox · required
  - Calisthenics · `fitness_category` · checkbox · required
  - HIIT · `fitness_category` · checkbox · required
  - Strength Training · `fitness_category` · checkbox · required
  - Group Activity · `fitness_category` · checkbox · required
  - Nutrition · `fitness_category` · checkbox · required
  - Steam · `fitness_category` · checkbox · required
  - Locker · `fitness_category` · checkbox · required
  - Free Body Weight · `fitness_category` · checkbox · required
- **Working Days**
  - `start_date` · text
  - `end_date` · text
  - Monday · `working_days` · checkbox
  - Tuesday · `working_days` · checkbox
  - Wednesday · `working_days` · checkbox
  - Thursday · `working_days` · checkbox
  - Friday · `working_days` · checkbox
  - Saturday · `working_days` · checkbox
  - Sunday · `working_days` · checkbox
- **Timing**
  - Start Time * · `session_slot_from_1` · text · required
  - End Time · `session_slot_to_1` · text · required
  - Unisex · `session_slot_1_gender` · radio · required
  - Men · `session_slot_1_gender` · radio · required
  - Women · `session_slot_1_gender` · radio · required
- [button] Back
- [button] Save & Close
- [button] Save

### Batches & Classes › Batch List

`/fitness-center/batch/batch-list/`

Headings: Batch Listing
Columns: Batch Name | Time | Date | Service Categories | Capacity | Fixed Batch Members | Trainers | Days | Action
Filter labels: All · Sunday · Monday · Tuesday · Wednesday · Thursday · Friday · Saturday
Actions: Reset Password · Log Out · Search · Select Day(s) ▾ · Delete · Deactivate · Activate · Add Batch · Import Batches · Deactivated Batches · View Batchwise Members

Form 2:
- **Batch Listing**
  - All · `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
  - `select_category` · select · options: Select Category, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
- [button] Select Day(s) ▾
  - All · `select_day` · checkbox
  - Sunday · `select_day` · checkbox
  - Monday · `select_day` · checkbox
  - Tuesday · `select_day` · checkbox
  - Wednesday · `select_day` · checkbox
  - Thursday · `select_day` · checkbox
  - Friday · `select_day` · checkbox
  - Saturday · `select_day` · checkbox
- [button] Delete
- [button] Deactivate
- [button] Activate
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS BATCH ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE SELECTED BATCH ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE SELECTED BATCH ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS BATCH ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE SELECTED BATCH ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE SELECTED BATCH ?** — buttons: No

Opens: `/merchant/fitness-center/client-database/{id}/1/` · `/fitness-center/batch/edit/Batch-{id}/` · `/merchant/fitness-center/client-database/{id}/0/?is_apply_filer=SCREEN&&client_type=Member`

### Batches & Classes › Class Bookings

`/fitness-center/class/customer-list/0/`

Headings: Mark Customer Attendance · Attendance Listing · No Customer Found
Actions: Reset Password · Log Out · Search · Submit · Cancel Booking · Check In · Back · Next

Form 3:
- **Attendance Listing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
  - `trainer_select` · select · options: {9 people/records}
  - `wise_select` · select · options: Classwise Attendance, Batchwise Attendance
  - `batch_select` · select · options: Select The Batch, 5:00 AM - 6:30 AM (Batch-5755), 5:30 AM - 7:00 AM (Batch-5756), 6:00 AM - 7:30 AM (Batch-5757), 6:30 AM - 8:00 AM (Batch-5758), 7:00 AM - 8:30 AM (Batch-5759), 7:30 AM - 9:00 AM (Batch-5760), 8:00 AM - 9:30 AM (Batch-5761), 8:30 AM - 10:00 AM (Batch-5762), 9:00 AM - 10:30 AM (Batch-5763), 9:30 AM - 11:00 AM (Batch-5764), 10:00 AM - 11:30 AM (Batch-5765), 10:30 AM - 12:00 PM (Batch-5767), 2:00 PM - 3:30 PM (Batch-5776), 2:30 PM - 4:00 PM (Batch-5777), 3:00 PM - 4:30 PM (Batch-5778), 3:30 PM - 5:00 PM (Batch-5779), 4:00 PM - 5:30 PM (Batch-5780), 4:30 PM - 6:00 PM (Batch-5775), 5:00 PM - 6:30 PM (Batch-5768), 5:30 PM - 7:00 PM (Batch-5769), 6:00 PM - 7:30 PM (Batch-5770), 6:30 PM - 8:00 PM (Batch-5771), 7:00 PM - 8:30 PM (Batch-5772), 7:30 PM - 9:00 PM (Batch-5773) … (+2)
  - `select_category` · select · options: Select Category, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
  - `class_date` · text
- [button] Submit
- [button] Cancel Booking
- [button] Check In
- **No Customer Found**
- [button] Back
- [button] Next

Other fields:
  - `trainer_select_ext` · select · options: {9 people/records}
  - `select_category` · select · options: Select Category, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
  - `batch_select_ext` · select · options: Select The Batch, 5:00 AM - 6:30 AM (Batch-5755) (5 a.m. - 6:30 a.m.), 5:30 AM - 7:00 AM (Batch-5756) (5:30 a.m. - 7 a.m.), 6:00 AM - 7:30 AM (Batch-5757) (6 a.m. - 7:30 a.m.), 6:30 AM - 8:00 AM (Batch-5758) (6:30 a.m. - 8 a.m.), 7:00 AM - 8:30 AM (Batch-5759) (7 a.m. - 8:30 a.m.), 7:30 AM - 9:00 AM (Batch-5760) (7:30 a.m. - 9 a.m.), 8:00 AM - 9:30 AM (Batch-5761) (8 a.m. - 9:30 a.m.), 8:30 AM - 10:00 AM (Batch-5762) (8:30 a.m. - 10 a.m.), 9:00 AM - 10:30 AM (Batch-5763) (9 a.m. - 10:30 a.m.), 9:30 AM - 11:00 AM (Batch-5764) (9:30 a.m. - 11 a.m.), 10:00 AM - 11:30 AM (Batch-5765) (10 a.m. - 11:30 a.m.), 10:30 AM - 12:00 PM (Batch-5767) (10:30 a.m. - noon), 2:00 PM - 3:30 PM (Batch-5776) (2 p.m. - 3:30 p.m.), 2:30 PM - 4:00 PM (Batch-5777) (2:30 p.m. - 4 p.m.), 3:00 PM - 4:30 PM (Batch-5778) (3 p.m. - 4:30 p.m.), 3:30 PM - 5:00 PM (Batch-5779) (3:30 p.m. - 5 p.m.), 4:00 PM - 5:30 PM (Batch-5780) (4 p.m. - 5:30 p.m.), 4:30 PM - 6:00 PM (Batch-5775) (4:30 p.m. - 6 p.m.), 5:00 PM - 6:30 PM (Batch-5768) (5 p.m. - 6:30 p.m.), 5:30 PM - 7:00 PM (Batch-5769) (5:30 p.m. - 7 p.m.), 6:00 PM - 7:30 PM (Batch-5770) (6 p.m. - 7:30 p.m.), 6:30 PM - 8:00 PM (Batch-5771) (6:30 p.m. - 8 p.m.), 7:00 PM - 8:30 PM (Batch-5772) (7 p.m. - 8:30 p.m.), 7:30 PM - 9:00 PM (Batch-5773) (7:30 p.m. - 9 p.m.) … (+2)
  - `datetimepicker_top` · text

### Batches & Classes › Classes Calender

`/merchant/fitness-center/customers/day-classes/`

Headings: Classes Calender
Actions: Reset Password · Log Out

Form 2:
- **Classes Calender**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - `trainer_list` · select · options: {17 people/records}

Pop-up: **Class Details** — buttons: Remove Members, Lookup Member code, Add Customer
  - `update_title` · text
  - Start Time · `update_appoinment_start_time` · text
  - End Time · `update_appoinment_end_time` · text
  - `update_booked_customers_dropdown` · select · options: 
  - `cust_code` · text
  - `update_booked_count` · text
  - `update_slot_remaining` · text
  - `update_total_capicity` · text
  - `update_total_enrolled` · text
  - `update_trainers` · text
  - `update_descriptions` · textarea

### Batches & Classes › Program

#### Batches & Classes › Program › Add Program

`/fixed-program/basic-information/`

Headings: Fitness Center Programs · Working Days · Gender · Timings · Conducted By · Services *
Filter labels: Program Name * · Meeting Link * · Working Days · Gender · Start Time * · End Time · Program Type: · Conducted by · Services *
Actions: Reset Password · Log Out · Back · Save & Next · Save

Form 2:
  - Program Name * · `program_name` · text · required
  - Meeting Link * · `meeting_link` · text · required
- **Working Days**
  - Monday · `working_days` · checkbox
  - Tuesday · `working_days` · checkbox
  - Wednesday · `working_days` · checkbox
  - Thursday · `working_days` · checkbox
  - Friday · `working_days` · checkbox
  - Saturday · `working_days` · checkbox
  - Sunday · `working_days` · checkbox
- **Gender**
  - Unisex · `gender` · radio
  - Men · `gender` · radio
  - Women · `gender` · radio
- **Timings**
  - Start Time * · `program_start_time` · text · required
  - End Time · `program_end_time` · text · required
  - Program Type: · `sub_type` · select · options: All Clients, Only Paid Clients, Only Free Trial Clients, Only Paid & Trial Clients, Only Prospects/Enquiries, Only Prospects/Enquiries & Trial Clients, Only Expired & Trial Clients, Only Expired
- **Conducted By**
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
- **Services ***
  - Weight Training · `fitness_category` · checkbox
  - Cardio · `fitness_category` · checkbox
  - Cross-fit · `fitness_category` · checkbox
  - Personal Training / Nutrition · `fitness_category` · checkbox
  - Calisthenics · `fitness_category` · checkbox
  - HIIT · `fitness_category` · checkbox
  - Strength Training · `fitness_category` · checkbox
  - Group Activity · `fitness_category` · checkbox
  - Nutrition · `fitness_category` · checkbox
  - Steam · `fitness_category` · checkbox
  - Locker · `fitness_category` · checkbox
  - Free Body Weight · `fitness_category` · checkbox
- [button] Back
- [button] Save & Next
- [button] Save

#### Batches & Classes › Program › Program List

`/fixed-program/list/`

Headings: Fixed Program Listing
Columns: Program Name | Program Days | Program Type | Link | Status | Action
Filter labels: Program Type:
Actions: Reset Password · Log Out · Search · Deactivate · Activate · Add Program

Form 2:
  - Search · `search_in_list` · text
- [button] Search
  - Program Type: · `prog_type` · select · options: Select Program, All Clients, Only Paid Clients, Only Free Trial Clients, Only Paid & Trial Clients, Only Prospects/Enquiries, Only Prospects/Enquiries & Trial Clients, Only Expired & Trial Clients, Only Expired
- [button] Deactivate
- [button] Activate
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS PROGRAM ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE THIS PROGRAM ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE THIS PROGRAM ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO END MEETING ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS PROGRAM ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE THIS PROGRAM ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE THIS PROGRAM ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO END MEETING ?** — buttons: No

#### Batches & Classes › Program › Program Attendance

`/fitness-center/program/program-attendance-list/`

Headings: Program Attendance Listing · Total : 0 · No Customer Found
Filter labels: Select Date Range
Actions: Reset Password · Log Out · Submit · Export To CSV · Back · Next

Form 2:
- **Program Attendance Listing**
  - Select Date Range · `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
- [button] Submit
  - `batch_select` · select · required · options: Select Program
- **Total : #**
- [button] Export To CSV
- **No Customer Found**
- [button] Back
- [button] Next

### Batches & Classes › Other Options

#### Batches & Classes › Other Options › Classes Capacity Info

`/fitness-center/class/class-list/`

Headings: Classes Capacity Info
Columns: Class Name | Conducted By | Start Time | End Time | Days | Total Booked/Total Limit
Filter labels: Conducted By · Select Date
Actions: Reset Password · Log Out · Search · Submit · Back · Next

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **Classes Capacity Info**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Class Name or Batch ID · `search_list` · text
- [button] Search
  - `trainer_select` · select · options: {9 people/records}
- [button] Submit
  - `picker_date` · text
- [button] Back
- [button] Next

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

#### Batches & Classes › Other Options › Batchwise Attendance List

`/fitness-center/batch/batch-attendance-list/`

Headings: Batch Attendance Listing · Total : 10
Columns: Customer Name | Batch Name | Check-In & Check-Out Time | Conducted By | Category | Subscription Status
Filter labels: Select Date Range
Actions: Reset Password · Log Out · Search · Submit · Export To CSV · Export to CSV · Back · Next

Form 2:
- **Batch Attendance Listing**
  - Select Date Range · `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by customer name · `search_list` · text
- [button] Search
- [button] Submit
  - `batch_select` · select · options: Select The Batch, 5:00 AM - 6:30 AM, 5:30 AM - 7:00 AM, 6:00 AM - 7:30 AM, 6:30 AM - 8:00 AM, 7:00 AM - 8:30 AM, 7:30 AM - 9:00 AM, 8:00 AM - 9:30 AM, 8:30 AM - 10:00 AM, 9:00 AM - 10:30 AM, 9:30 AM - 11:00 AM, 10:00 AM - 11:30 AM, 10:30 AM - 12:00 PM, 2:00 PM - 3:30 PM, 2:30 PM - 4:00 PM, 3:00 PM - 4:30 PM, 3:30 PM - 5:00 PM, 4:00 PM - 5:30 PM, 4:30 PM - 6:00 PM, 5:00 PM - 6:30 PM, 5:30 PM - 7:00 PM, 6:00 PM - 7:30 PM, 6:30 PM - 8:00 PM, 7:00 PM - 8:30 PM, 7:30 PM - 9:00 PM … (+3)
  - `select_category` · select · options: Select Category, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
  - `type_select` · select · options: By Both Live & Scan QR, By Live Session, By Scan QR
- [button] Export To CSV
- [button] Export to CSV
- **Total : #**
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

Opens: `/fitness-center/customer/Customer-{id}/`

#### Batches & Classes › Other Options › Class Waiting List

`/fitness-center/class/customer-class-bookings/`

Headings: WaitingList
Columns: Customer Name | Batch ID | Request Date | Class Booking Date | Class Start Time | Class End Time | Booking Status | Booking Token | Action
Filter labels: End Date · Start Date · Booking Status
Actions: Reset Password · Log Out · Search · Submit · Delete · Back · Next

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **WaitingList**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Name or Mobile Number or Email · `search_list` · text
- [button] Search
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `booking_status` · select · options: All Status, Pending, Approved, Rejected
- [button] Delete
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE SELECTED CLASS BOOKING ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

Pop-up: **ARE YOU SURE YOU WANT TO DELETE SELECTED CLASS BOOKING ?** — buttons: No

#### Batches & Classes › Other Options › Class Attendance

`/merchant/fitness-center/customers/class-register/`

Headings: Class AttendanceListing
Columns: Customer Name | Class Name | Class Date-Time | Service Categories | Trainers | Days | By Plan Name | Booking On
Filter labels: From · Select Batch · Select Category
Actions: Reset Password · Log Out · Search · Export to CSV · Download Excel Now · Submit

Other fields:
  - Search by Name or Mobile Number or Email · `search_list` · text
  - `end_picker_date` · text
  - `start_picker_date` · text
  - Select Batch · `batch_select` · select · options: All Batch
  - Select Category · `cat_select` · select · options: All Category

#### Batches & Classes › Other Options › Cancelled Class Register

`/merchant/fitness-center/customers/cancel-class-register/`

Headings: Cancel Class HistoryNote: Past 30 days cancelled history will be displayed.
Columns: Customer Name | Class Name | Class Date-Time | Service Categories | Trainers | Days | Booking On | Cancelled On | Cancel Source
Filter labels: From · Select Batch
Actions: Reset Password · Log Out · Search · Export to CSV · Submit

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **Cancel Class HistoryNote: Past 30 days cancelled history will be displayed.**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Name or Mobile Number or Email · `search_list` · text
- [button] Search
- [button] Export to CSV
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - Select Batch · `batch_select` · select · options: All Batches, 10:00 AM - 11:30 AM (Batch-5765), 10:30 AM - 12:00 PM (Batch-5767), 2:00 PM - 3:30 PM (Batch-5776), 2:30 PM - 4:00 PM (Batch-5777), 3:00 PM - 4:30 PM (Batch-5778), 3:30 PM - 5:00 PM (Batch-5779), 4:00 PM - 5:30 PM (Batch-5780), 4:30 PM - 6:00 PM (Batch-5775), 5:00 AM - 6:30 AM (Batch-5755), 5:00 PM - 6:30 PM (Batch-5768), 5:30 AM - 7:00 AM (Batch-5756), 5:30 PM - 7:00 PM (Batch-5769), 6:00 AM - 7:30 AM (Batch-5757), 6:00 PM - 7:30 PM (Batch-5770), 6:30 AM - 8:00 AM (Batch-5758), 6:30 PM - 8:00 PM (Batch-5771), 7:00 AM - 8:30 AM (Batch-5759), 7:00 PM - 8:30 PM (Batch-5772), 7:30 AM - 9:00 AM (Batch-5760), 7:30 PM - 9:00 PM (Batch-5773), 8:00 AM - 9:30 AM (Batch-5761), 8:00 PM - 9:30 PM (Batch-5766), 8:30 AM - 10:00 AM (Batch-5762), 8:30 PM - 10:00 PM (Batch-5774) … (+2)

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

#### Batches & Classes › Other Options › Deleted Class Register

`/merchant/fitness-center/customers/delete-class-register/`

Headings: Deleted Class HistoryNote: Past 30 days Deleted history will be displayed.
Columns: Customer Name | Class Name | Class Date-Time | Service Categories | Trainers | Days | Booking On | Deleted On | Delete Source
Filter labels: From · Select Batch · Select Category
Actions: Reset Password · Log Out · Search · Submit

Other fields:
  - Search by Name or Mobile Number or Email · `search_list` · text
  - `end_picker_date` · text
  - `start_picker_date` · text
  - Select Batch · `batch_select` · select · options: All Batch
  - Select Category · `cat_select` · select · options: All Category

#### Batches & Classes › Other Options › Class Feedbacks

`/merchant/fitness-center/customers/class-feedback-listing/`

Headings: Class Feedback Listing
Columns: Customer | Class Name | Category | Rating | Experience & Suggestions | Submitted At
Filter labels: From · Select Batch · Select Category · Rating · Group by Class · 🏆 Top Trainers — highest-rated classes:
Actions: Reset Password · Log Out · Search · Submit

Other fields:
  - Search by Name or Mobile Number or Email · `search_list` · text
  - `end_picker_date` · text
  - `start_picker_date` · text
  - Select Batch · `batch_select` · select · options: All Batch
  - Select Category · `cat_select` · select · options: All Category
  - Group by Class · `id_group_by_batch` · checkbox

#### Batches & Classes › Other Options › Daily Booking Appointment

`/merchant/fitness-center/customers/day-classes-appointment/`

Headings: Daily Booking Appointment
Actions: Reset Password · Log Out · Book Appointment

Form 2:
  - Status · `second_day_page` · text
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - `trainer_list` · select · options: {17 people/records}
  - `datePicker` · date
- [button] Book Appointment
- [button] ×
- **Schedule Appointment**
  - Status · `appoinment_status` · select · options: Open, No Action, Attended, No Show, Cancelled
  - `comments` · text
  - `batch_select` · select · options: Select Service, 5:00 AM - 6:30 AM, 5:30 AM - 7:00 AM, 6:00 AM - 7:30 AM, 6:30 AM - 8:00 AM, 7:00 AM - 8:30 AM, 7:30 AM - 9:00 AM, 8:00 AM - 9:30 AM, 8:30 AM - 10:00 AM, 9:00 AM - 10:30 AM, 9:30 AM - 11:00 AM, 10:00 AM - 11:30 AM, 8:00 PM - 9:30 PM, 10:30 AM - 12:00 PM, 5:00 PM - 6:30 PM, 5:30 PM - 7:00 PM, 6:00 PM - 7:30 PM, 6:30 PM - 8:00 PM, 7:00 PM - 8:30 PM, 7:30 PM - 9:00 PM, 8:30 PM - 10:00 PM, 4:30 PM - 6:00 PM, 2:00 PM - 3:30 PM, 2:30 PM - 4:00 PM, 3:00 PM - 4:30 PM … (+2)
  - `appoinment_date` · text · required
  - Start Time * · `appoinment_start_time` · text · required
  - End Time * · `appoinment_end_time` · text · required
  - Customer Code * · `cust_code` · text
  - `handled_by_select` · select · options: {16 people/records}
  - Room No. · `room_no` · text
  - Yes · `noti_to_client` · radio
  - No · `noti_to_client` · radio
- [button] Close
- [button] Save changes

Pop-up: **Schedule Appointment** — buttons: Lookup Member code, Lookup Enquiry code, Save changes
  - Status · `appoinment_status` · select · options: Open, No Action, Attended, No Show, Cancelled
  - `comments` · text
  - `batch_select` · select · options: Select Service, 5:00 AM - 6:30 AM, 5:30 AM - 7:00 AM, 6:00 AM - 7:30 AM, 6:30 AM - 8:00 AM, 7:00 AM - 8:30 AM, 7:30 AM - 9:00 AM, 8:00 AM - 9:30 AM, 8:30 AM - 10:00 AM, 9:00 AM - 10:30 AM, 9:30 AM - 11:00 AM, 10:00 AM - 11:30 AM, 8:00 PM - 9:30 PM, 10:30 AM - 12:00 PM, 5:00 PM - 6:30 PM, 5:30 PM - 7:00 PM, 6:00 PM - 7:30 PM, 6:30 PM - 8:00 PM, 7:00 PM - 8:30 PM, 7:30 PM - 9:00 PM, 8:30 PM - 10:00 PM, 4:30 PM - 6:00 PM, 2:00 PM - 3:30 PM, 2:30 PM - 4:00 PM, 3:00 PM - 4:30 PM … (+2)
  - `appoinment_date` · text · required
  - Start Time * · `appoinment_start_time` · text · required
  - End Time * · `appoinment_end_time` · text · required
  - Customer Code * · `cust_code` · text
  - `handled_by_select` · select · options: {16 people/records}
  - Room No. · `room_no` · text
  - Yes · `noti_to_client` · radio
  - No · `noti_to_client` · radio

Pop-up: **Edit Class** — buttons: Save Changes
  - Appointment Name: · `update_comment` · text · required
  - Start Time: · `update_appoinment_start_time` · time · required
  - End Time: · `update_appoinment_end_time` · time · required
  - `update_handled_by` · select · options: 

## Accounts

### Accounts › Account Registers

#### Accounts › Account Registers › Collection Report

`/gym-collection-report/`

Headings: Collection Report · To generate a report, select the CSV report and date below, click Submit, and then click on the Generate Report button. · Select CSV Report · Download upto 3 months data at one go.
Filter labels: From
Actions: Reset Password · Log Out · Submit · Click Here to Generate a Collection report in PDF · Click Here to Generate a Sales report in PDF

Form 2:
- **Collection Report**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
- **Select CSV Report**
  - `csv_select` · multiselect · options: Select CSV Report, Click Here to Generate a Excel Collection report, Click Here to Generate a Excel Sales report, Download updated receipts data
  - From · `start_picker_date` · text
  - To · `end_picker_date` · text
- [button] Submit
- **Download upto 3 months data at one go.**

Opens: `/export_daily_collection_to_pdf/?picker_date_start={id}-10-08 00:00:00&picker_date_end={id}-10-08 23:59:59` · `/export_daily_wo_collection_to_pdf/?picker_date_start={id}-10-08 00:00:00&picker_date_end={id}-10-08 23:59:59`

#### Accounts › Account Registers › Receipt Register

`/merchant/fitness-center/customers/payments/`

Headings: Receipt RegisterListing
Columns: Invoice No.. | Receipt No. | Receipt Date | Customer Id. | Customer Name | Receipt added by | Plan Name | Start Date | End Date | Mode | Total Bill Amount | Receipt Paid Amount | Total Balance Amount | Action
Filter labels: From
Actions: Reset Password · Log Out · View Billing Analysis · Search · Send SMS · Submit · Export to CSV · Balance Amount : 0

Form 2:
- **Receipt RegisterListing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search By Name or Phone or Invoice Number or Email · `search_list` · text
- [button] Search
- [button] Send SMS
- [button] x
- **Send SMS**
- **SMS Body**
  - Keep your SMS short. · `text_sms_body` · textarea
- [button] Send SMS
- [button] Cancel
- [button] Submit
  - To · `dropdown` · select · options: All Data 📅, Today (08 October 2026 - 08 October 2026), This Month (01 October 2026 - 31 October 2026), Last Month (01 September 2026 - 30 September 2026), Last 3 Days (05 October 2026 - 08 October 2026), Last 7 Days (01 October 2026 - 08 October 2026), Last 15 Days (23 September 2026 - 08 October 2026), Last 30 Days (08 September 2026 - 08 October 2026), Custom (01 October 2026 - 31 October 2026)
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `membership_plan` · select · options: {64 people/records}
  - `services` · select · options: Select Service, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
  - `created_by` · select · options: {15 people/records}
  - `pay_method` · select · options: Select Payment Mode, CASH, ONLINE, Credit Card, Debit Card, Card, PAYTM, Cheque, NEFT, Google Pay, PhonePay, Fitternity, PayPal, PayedApp, Razorpay, Paylater, Pay U, HDFC, Save In, UPI, Tabby, Tabby Card, Postpay, Tamara, Third party … (+5)
  - `pay_status` · select · options: Status, Paid, Cancel
  - `client_rep` · select · options: {15 people/records}
  - `gender_filter` · select · options: Gender, Male, Female, Other
  - `sub_status` · select · options: Subscription Status, Active, Pending, Expired
  - `batch_filter` · select · options: Batch List, 5:00 AM - 6:30 AM, 5:30 AM - 7:00 AM, 6:00 AM - 7:30 AM, 6:30 AM - 8:00 AM, 7:00 AM - 8:30 AM, 7:30 AM - 9:00 AM, 8:00 AM - 9:30 AM, 8:30 AM - 10:00 AM, 9:00 AM - 10:30 AM, 9:30 AM - 11:00 AM, 10:00 AM - 11:30 AM, 8:00 PM - 9:30 PM, 10:30 AM - 12:00 PM, 5:00 PM - 6:30 PM, 5:30 PM - 7:00 PM, 6:00 PM - 7:30 PM, 6:30 PM - 8:00 PM, 7:00 PM - 8:30 PM, 7:30 PM - 9:00 PM, 8:30 PM - 10:00 PM, 4:30 PM - 6:00 PM, 2:00 PM - 3:30 PM, 2:30 PM - 4:00 PM, 3:00 PM - 4:30 PM … (+2)
- [button] Export to CSV
  - `check-all-box` · checkbox

Pop-up: **Send SMS** — buttons: Send SMS, Cancel
  - Keep your SMS short. · `text_sms_body` · textarea

Opens: `/fitness-center/customer/make-payment/Customer-{id}/{id}/` · `/get_overall_reciept/NjM5NDE0MA/?&receipt_by= {id}` · `/get_overall_reciept/NjM5MzUzOQ/?&receipt_by= {id}` · `/get_overall_reciept/NjM2MzU4Mw/?&receipt_by= {id}` · `/get_overall_reciept/NjM0OTI2MQ/?&receipt_by= {id}` · `/get_overall_reciept/NjM0OTI4Mw/?&receipt_by= {id}` · `/get_overall_reciept/NjM1MDg3Mg/?&receipt_by= {id}` · `/get_overall_reciept/NjMyOTk3NA/?&receipt_by= {id}`

#### Accounts › Account Registers › Subscriptions Register

`/merchant/fitness-center/customers/sales-resgister/`

Headings: Subscription RegisterListing
Columns: Invoice No. | Invoice Date | Customer Name | Plan Name | Start Date | End Date | Plan Status | Net Sale Amount | GST | Total Sale Amount | Payment Status | Action !
Filter labels: From
Actions: Reset Password · Log Out · Search · Export to CSV · View Change Request · Submit · Back · Next

Form 2:
- **Subscription RegisterListing**
  - To · `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
- [button] Export to CSV
- [button] Submit
  - To · `dropdown` · select · options: All Data 📅, Today (08 October 2026 - 08 October 2026), This Month (01 October 2026 - 08 October 2026), Last Month (01 September 2026 - 30 September 2026), Last 3 Days (05 October 2026 - 08 October 2026), Last 7 Days (01 October 2026 - 08 October 2026), Last 15 Days (23 September 2026 - 08 October 2026), Last 30 Days (08 September 2026 - 08 October 2026), Custom (2022-08-30 - 2026-10-08)
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `membership_plan` · select · options: {64 people/records}
  - `services` · select · options: Select Service, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
  - `created_by` · select · options: {15 people/records}
  - `pay_status` · select · options: Payment Status, Paid, Pending
  - `gender_filter` · select · options: Gender, Male, Female, Other
  - `sub_status` · select · options: Subscription Status, Active, Expired, Used, Pending
  - `sub_type` · select · options: Subscription Type, Free, Paid
  - `subscptn_service` · select · options: Subscription Service Type, Gym, P.T
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

Opens: `/fitness-center/customer/make-payment/Customer-{id}/{id}/`

#### Accounts › Account Registers › Cash Register

`/merchant/fitness-center/customers/cash-payment-register/`

Headings: Cash Payment RegisterListing
Columns: Invoice No.. | Receipt No. | Receipt Date | Customer Id. | Customer Name | Receipt added by | Plan Name | Start Date | End Date | Mode | Total Bill Amount | Receipt Paid Amount | Total Balance Amount | Action
Filter labels: From
Actions: Reset Password · Log Out · Search · Submit · Balance Amount : 0 · Back · Next

Form 2:
- **Cash Payment RegisterListing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search By Name or Phone or Invoice Number or Email · `search_list` · text
- [button] Search
- [button] x
- **Send SMS**
- **SMS Body**
  - Keep your SMS short. · `text_sms_body` · textarea
- [button] Send SMS
- [button] Cancel
- [button] Submit
  - To · `dropdown` · select · options: All Data 📅, Today (08 October 2026 - 08 October 2026), This Month (01 October 2026 - 08 October 2026), Last Month (01 September 2026 - 30 September 2026), Last 3 Days (05 October 2026 - 08 October 2026), Last 7 Days (01 October 2026 - 08 October 2026), Last 15 Days (23 September 2026 - 08 October 2026), Last 30 Days (08 September 2026 - 08 October 2026), Custom (01 October 2026 - 08 October 2026)
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `membership_plan` · select · options: {64 people/records}
  - `services` · select · options: Select Service, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
  - `created_by` · select · options: {15 people/records}
  - `batch_filter` · select · options: Batch List, 5:00 AM - 6:30 AM, 5:30 AM - 7:00 AM, 6:00 AM - 7:30 AM, 6:30 AM - 8:00 AM, 7:00 AM - 8:30 AM, 7:30 AM - 9:00 AM, 8:00 AM - 9:30 AM, 8:30 AM - 10:00 AM, 9:00 AM - 10:30 AM, 9:30 AM - 11:00 AM, 10:00 AM - 11:30 AM, 8:00 PM - 9:30 PM, 10:30 AM - 12:00 PM, 5:00 PM - 6:30 PM, 5:30 PM - 7:00 PM, 6:00 PM - 7:30 PM, 6:30 PM - 8:00 PM, 7:00 PM - 8:30 PM, 7:30 PM - 9:00 PM, 8:30 PM - 10:00 PM, 4:30 PM - 6:00 PM, 2:00 PM - 3:30 PM, 2:30 PM - 4:00 PM, 3:00 PM - 4:30 PM … (+2)
  - `pay_status` · select · options: Status, Paid, Cancel
  - `client_rep` · select · options: {15 people/records}
  - `gender_filter` · select · options: Gender, Male, Female, Other
  - `sub_status` · select · options: Subscription Status, Active, Pending, Expired
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

Pop-up: **Send SMS** — buttons: Send SMS, Cancel
  - Keep your SMS short. · `text_sms_body` · textarea

Opens: `/fitness-center/customer/make-payment/Customer-{id}/{id}/` · `/get_overall_reciept/NjM5MzUzOQ/?&receipt_by= {id}` · `/get_overall_reciept/NjM0OTI2MQ/?&receipt_by= {id}` · `/get_overall_reciept/NjM0OTI4Mw/?&receipt_by= {id}`

#### Accounts › Account Registers › Session Register

`/merchant/fitness-center/customers/pt-register/`

Headings: Session RegisterListing
Columns: Invoice Date | Customer Name | Plan Name | Trainer Name | Start Date | End Date | Sessions | Sale Amount | Payment Status | Action
Actions: Reset Password · Log Out · Search · Back · Next

Form 2:
- **Session RegisterListing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
- [button] x
- **Send SMS**
- **SMS Body**
  - Keep your SMS short. · `text_sms_body` · textarea
- [button] Send SMS
- [button] Cancel
  - `membership_plan` · select · options: {15 people/records}
  - `trainer_list` · select · options: {17 people/records}
  - `created_by` · select · options: {15 people/records}
  - `pay_status` · select · options: Payment Status, Paid, Pending
  - `gender_filter` · select · options: Gender, Male, Female, Other
  - `sub_status` · select · options: Subscription Status, Active, Pending, Expired, Used
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

Pop-up: **Send SMS** — buttons: Send SMS, Cancel
  - Keep your SMS short. · `text_sms_body` · textarea

Opens: `/fitness-center/customer/Customer-{id}/` · `/fitness-center/customer/pt-session-register/Customer-{id}/{id}/#pt_screen` · `/get_overall_reciept/{id}/`

#### Accounts › Account Registers › Recorded Session Register

`/merchant/fitness-center/customers/recorded_session/`

Headings: Recorded Session Listing
Columns: Record Date | Customer Name | Trainer Name | Action Taken By | Activity | Client Show/No Show
Actions: Reset Password · Log Out · Search · Export to CSV · Export Incentives CSV · Back · Next

Form 2:
- **Recorded Session Listing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
- [button] Export to CSV
- [button] Export Incentives CSV
  - `trainer_list` · select · options: {17 people/records}
  - `created_by` · select · options: {15 people/records}
  - `client_show` · select · options: All Show, Show Client, Client No Show
  - `gender_filter` · select · options: Gender, Male, Female, Other
  - `cust_batch_select` · select · options: {27 people/records}
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

#### Accounts › Account Registers › Deleted Session Register

`/merchant/fitness-center/customers/delete-pt-register/`

Headings: Deleted Session Register
Columns: Customer Name | Plan Name | Deduct Date-Time | Show/No Show | Trainer | Service | Class | Deleted On | Delete Source
Filter labels: From · Select Staff
Actions: Reset Password · Log Out · Search · Submit

Other fields:
  - Search by Name or Mobile Number or Email · `search_list` · text
  - `end_picker_date` · text
  - `start_picker_date` · text
  - Select Staff · `staff_select` · select · options: All Staff

#### Accounts › Account Registers › Coupon Code Register

`/merchant/fitness-center/customers/coupon-code-register/`

Headings: Coupon Code Register
Columns: Customer Name | Plan Name | Start Date | End Date | Plan Status | Payment Date | Coupon Name | Coupon Code | Coupon Type | Coupon Status | Sale Amount | Coupon Discount | Total Sale Amount | Payment Status
Filter labels: From · Select Membership · Select Coupon · Subscription Status
Actions: Reset Password · Log Out · Search · Submit

Other fields:
  - Search by Name or Mobile Number or Email · `search_list` · text
  - `end_picker_date` · text
  - `start_picker_date` · text
  - Select Membership · `membership_select` · select · options: All Membership
  - Select Coupon · `coupon_select` · select · options: All Coupon
  - Subscription Status · `plan_status_select` · select · options: All Status, Active, Expired, Used, Pending

#### Accounts › Account Registers › Expired Membership Register

`/merchant/fitness-center/customers/expiry-membership-resgister/`

Headings: Expired Memberships RegisterListing
Columns: Invoice No. | Invoice Date | Customer Name | Plan Name | Start Date | End Date | Net Sale Amount | GST | Total Sale Amount | Payment Status | Action
Filter labels: From
Actions: Reset Password · Log Out · Search · Send Personalized WhatsApp · Send Customized WhatsApp · Send WhatsApp Reminders · View Analysis · Expired Session Register · Submit · Actions · Add Follow Up · See Receipts

Form 2:
- **Expired Memberships RegisterListing**
  - MESSAGE * · `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Name or invoice Number or Email · `search_list` · text
- [button] Search
- [button] Send Personalized WhatsApp
- [button] Send Customized WhatsApp
- [button] Send WhatsApp Reminders
- [button] x
- **SEND WHATSAPP MESSAGE**
  - Write your whatsapp message here... · `text_sms_body` · textarea
- [button] Send WhatsApp
- [button] Cancel
- [button] Submit
  - To · `dropdown` · select · options: Next 7 Days (08 October 2026 - 15 October 2026), Next 30 Days (08 October 2026 - 07 November 2026), Last 30 Days (08 September 2026 - 08 October 2026), Custom (08 October 2026 - 08 October 2026)
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `membership_plan` · select · options: {64 people/records}
  - `services` · select · options: Select Service, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
  - `created_by` · select · options: {15 people/records}
  - `pay_status` · select · options: Payment Status, Paid, Pending
  - `sub_type` · select · options: Subscription Type, Gym, P.T
  - `expiry_type_status` · select · options: Expired, To be expired
  - `trainer_assign_select` · select · options: {17 people/records}
  - `check-all-box` · checkbox
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions

Pop-up: **SEND WHATSAPP MESSAGE** — buttons: Send WhatsApp, Cancel
  - Write your whatsapp message here... · `text_sms_body` · textarea

Opens: `/fitness-center/customer/Customer-{id}/` · `/get_invoice/{id}/` · `/fitness-center/customer/folloup-history/Customer-{id}/0/#member_history` · `/fitness-center/customer/make-payment/Customer-{id}/{id}/`

#### Accounts › Account Registers › Expired Session Register

`/merchant/fitness-center/customers/expiry-membership-resgister-future/`

Headings: Expired Session RegisterListing
Columns: Invoice No. | Invoice Date | Customer Name | Plan Name | Start Date | End Date | Net Sale Amount | GST | Total Sale Amount | Payment Status | Action
Actions: Reset Password · Log Out

Form 2:
- **Expired Session RegisterListing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - `check-all-box` · checkbox

#### Accounts › Account Registers › Balance Due Register

`/merchant/fitness-center/customers/balance-due-register/`

Headings: Balance Due RegisterListing
Columns: Invoice No. | Customer Name | Plan Name | Start Date | End Date | Balance Due Date | Total Bill Amount | Balance Amount | Total Balance Amount | Action
Filter labels: From
Actions: Reset Password · Log Out · Search · Send Personalized WhatsApp · Send Customized WhatsApp · Send WhatsApp Reminders · Export to CSV · Submit · [redacted] · Actions · Add Follow Up · See Receipts · Back · Next

Form 2:
- **Balance Due RegisterListing**
  - MESSAGE * · `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Name or invoice Number or Email · `search_list` · text
- [button] Search
- [button] Send Personalized WhatsApp
- [button] Send Customized WhatsApp
- [button] Send WhatsApp Reminders
- [button] x
- **SEND WHATSAPP MESSAGE**
  - Write your whatsapp message here... · `text_sms_body` · textarea
- [button] Send WhatsApp
- [button] Cancel
- [button] Export to CSV
- [button] Submit
  - To · `dropdown` · select · options: All Data, Next 7 Days (08 October 2026 - 15 October 2026), Next 30 Days (08 October 2026 - 07 November 2026), Last 30 Days (08 September 2026 - 08 October 2026), Custom (01 January 2010 - 08 October 2026)
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `membership_plan` · select · options: {64 people/records}
  - `services` · select · options: Select Service, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
  - `created_by` · select · options: {15 people/records}
  - `sub_type` · select · options: Subscription Type, Gym, Personal Training
  - `check-all-box` · checkbox
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Back
- [button] Next

Pop-up: **SEND WHATSAPP MESSAGE** — buttons: Send WhatsApp, Cancel
  - Write your whatsapp message here... · `text_sms_body` · textarea

Opens: `/fitness-center/customer/make-payment/Customer-{id}/{id}/` · `/fitness-center/customer/folloup-history/Customer-{id}/0/#member_history`

#### Accounts › Account Registers › TAX Register

`/merchant/fitness-center/customers/gst-register/`

Headings: TAX RegisterListing
Columns: Receipt No. | Receipt Date | Invoice No. | Added by | Customer Name | Plan Name | Start Date | End Date | Mode | Receipt Paid Amount | Net Sale Amount | Total TAX Amount | Action
Actions: Reset Password · Log Out · Search · Back · Next

Form 2:
- **TAX RegisterListing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
  - `membership_plan` · select · options: {64 people/records}
  - `services` · select · options: Select Service, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
  - `created_by` · select · options: {15 people/records}
  - `pay_method` · select · options: Select Payment Mode, CASH, UPI, ONLINE, Credit Card, Debit Card, Card, PAYTM, Cheque, NEFT, Google Pay, PhonePay, Fitternity, MPESA, Payment Link
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

Opens: `/fitness-center/customer/make-payment/Customer-{id}/{id}/`

#### Accounts › Account Registers › Write Off Register

`/merchant/fitness-center/customers/write-off-register/`

Headings: Write Off RegisterListing
Columns: Receipt No. | Receipt Date | Invoice No. | Customer Name | Plan Name | Total Bill Amount | Write Off Amount | Payment Status | Action
Actions: Reset Password · Log Out · Search · Back · Next

Form 2:
- **Write Off RegisterListing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
  - `membership_plan` · select · options: {64 people/records}
  - `services` · select · options: Select Service, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
  - `created_by` · select · options: {15 people/records}
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

Opens: `/fitness-center/customer/make-payment/Customer-{id}/{id}/`

#### Accounts › Account Registers › Deleted Subscription Register

`/merchant/fitness-center/customers/deleted-subs-register/`

Headings: Deleted SubscriptionsListing
Columns: Invoice No. | Customer Name | Deleted By | Deleted Date | Plan Name | Start Date | End Date | Plan Status | Cancel Reason | Total Price | Paid Price | Balance Price
Filter labels: From · Membership · Deleted By · Subscription Status
Actions: Reset Password · Log Out · Search · Export to CSV · Deleted Member's Subscriptions · Submit · Back · Next

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **Deleted SubscriptionsListing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)

Form 3:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
  - Search · `search_list` · text
- [button] Search
- [button] Export to CSV
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `membership_plan` · select · options: {64 people/records}
  - `deleted_by` · select · options: Deleted By, [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person]
  - `sub_status` · select · options: Subscription Status, Active, Pending, Expired, Used, CANCELLED
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

Opens: `/fitness-center/customer/Customer-{id}/`

#### Accounts › Account Registers › Trial Register

`/merchant/fitness-center/customers/trial-subs-register/`

Headings: Trial SubscriptionsListing
Columns: Customer Name | Plan Name | Subscription Type | Start Date | End Date | Client Rep | Assign Trainer | Assign on
Filter labels: From · Client Rep · Assigned Trainer · Customer Type
Actions: Reset Password · Log Out · Search · Export to CSV · Submit

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **Trial SubscriptionsListing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Name or Mobile Number or Email · `search_list` · text
- [button] Search
- [button] Export to CSV
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - Client Rep · `staff_assign_select` · select · options: {15 people/records}
  - Assigned Trainer · `trainer_assign_select` · select · options: {17 people/records}
  - Customer Type · `customer_type` · select · options: All Type, Enquiry, Member

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

Opens: `/fitness-center/customer/Customer-{id}/`

#### Accounts › Account Registers › Cancel Subscription Register

`/merchant/fitness-center/customers/cancel-subs-register/`

Headings: Cancel SubscriptionsListing
Columns: Invoice No. | Customer Name | Cancelled By | Cancel Date | Plan Name | Start Date | End Date | Plan Status | Cancel Reason | Total Price
Filter labels: From · Membership · Cancelled By
Actions: Reset Password · Log Out · Search · Export to CSV · Submit · Back · Next

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **Cancel SubscriptionsListing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
- [button] Export to CSV
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `membership_plan` · select · options: {64 people/records}
  - `cancel_by` · select · options: Cancelled By, [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person]
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

Opens: `/fitness-center/customer/Customer-{id}/`

#### Accounts › Account Registers › Transfer Register

`/merchant/fitness-center/customers/transfer-subs-register/`

Headings: Transfer SubscriptionsListing
Columns: Package Name | Transfered From | Transfered To | Transfer Fees | Transfered By | Client Rep | Transfer On
Filter labels: From · Client Rep · Transfered By
Actions: Reset Password · Log Out · Search · Export to CSV · Submit

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **Transfer SubscriptionsListing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Name or Mobile Number or Email · `search_list` · text
- [button] Search
- [button] Export to CSV
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - Client Rep · `staff_assign_select` · select · options: {15 people/records}
  - Transfered By · `transfer_by_obj` · select · options: All, [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person]

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

Opens: `/fitness-center/customer/Customer-{id}/`

#### Accounts › Account Registers › Freeze Register

`/merchant/fitness-center/customers/freeze-subs-register/`

Headings: Freezed SubscriptionsListing
Columns: Customer Name | Package Name | Freeze Days | Freeze Dates | Freezed By | Notes | Client Rep | Freeze Fees
Filter labels: From · Client Rep · Freezed By
Actions: Reset Password · Log Out · View Freeze Request · Search · Export to CSV · Submit · Back · Next

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **Freezed SubscriptionsListing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
- [button] Export to CSV
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `client_rep` · select · options: {15 people/records}
  - `freezed_by` · select · options: Freezed By, [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person]
- [button] Back
- [button] Next

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

Opens: `/fitness-center/customer/Customer-{id}/`

#### Accounts › Account Registers › Upgrade Register

`/merchant/fitness-center/customers/upgrade-register/`

Headings: UpgradeRegister Listing
Columns: Customer Name | Plan Name | Upgraded Package | Upgraded By | Client Rep. | Old Amount | Upgrade Amount
Filter labels: End Date · Start Date · Service · Client Rep · Upgraded by
Actions: Reset Password · Log Out · Search · Export to CSV · Submit

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **UpgradeRegister Listing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Name or Mobile Number or Email · `search_list` · text
- [button] Search
- [button] Export to CSV
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `services` · select · options: All Service, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
  - `staff_assign_select` · select · options: {15 people/records}
  - `upgrad_assign_select` · select · options: {15 people/records}

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

Opens: `/fitness-center/customer/Customer-{id}/`

#### Accounts › Account Registers › Extension Register

`/merchant/fitness-center/customers/extend-subs-register/`

Headings: ExtensionRegister
Columns: Customer Name | Subscription Name | Extension Done by | No. of Days Added | Extension Date | Notes | Client Rep. | Extension Fees
Filter labels: End Date · Start Date · Client Rep · Extended By
Actions: Reset Password · Log Out · Search · Export to CSV · View Extension Request · Submit · Back · Next

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **ExtensionRegister**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Name or Mobile Number or Email · `search_list` · text
- [button] Search
- [button] Export to CSV
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `client_rep` · select · options: {15 people/records}
  - `extended_by` · select · options: Extended By, [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person]
- [button] Back
- [button] Next

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

Opens: `/fitness-center/customer/Customer-{id}/`

#### Accounts › Account Registers › Downgrade Register

`/merchant/fitness-center/customers/downgrade-subs-register/`

Headings: Downgrade RegisterListing
Columns: Customer Name | Plan Name | Downgraded Package | Downgraded By | Notes | Client Rep | Old Amount | Downgrade Amount | Refund
Filter labels: From · Service · Downgraded By · Client Rep · Downgrade Packages
Actions: Reset Password · Log Out · Search · Export to CSV · Submit

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **Downgrade RegisterListing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Name or Mobile Number or Email · `search_list` · text
- [button] Search
- [button] Export to CSV
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - Service · `services` · select · options: Select Service, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
  - Downgraded By · `downgrade_by_select` · select · options: All Staff, [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person]
  - Client Rep · `staff_assign_select` · select · options: {15 people/records}
  - Downgrade Packages · `downgrade_package_select` · select · options: All Packages, 1 Month Signature, 3 Months Strengthening, Elite Training [3 Months]
  - `check-all-box` · checkbox

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

Opens: `/fitness-center/customer/Customer-{id}/`

#### Accounts › Account Registers › Course Orders

`/fitness-centers/course-my-orders/`

Headings: Course OrdersListing
Columns: Invoice Date | Customer Name | Course Name | Validity | Sale Amount | Payment Status | Action
Actions: Reset Password · Log Out · Search · Back · Next

Form 2:
- **Course OrdersListing**
  - Search · `search_list` · text
- [button] Search
  - `course_type` · select · options: Select Course Type, FREE, PAID
  - `pay_status` · select · options: Payment Status, Paid, Failed
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

#### Accounts › Account Registers › Receipt Register Log

`/merchant/fitness-center/customers/updated-receipt-register/`

Headings: Receipt Register LogListing
Columns: Invoice No.. | Receipt No. | Receipt Date. | Receipt Created Date | Customer Id. | Customer Name | Receipt added by | Plan Name | Start Date | End Date | Mode | Total Bill Amount | Receipt Paid Amount | Total Balance Amount | Action
Filter labels: From
Actions: Reset Password · Log Out · Search · Submit · Export to CSV · Balance Amount : 0 · Back · Next

Form 2:
- **Receipt Register LogListing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search By Name or Phone or Invoice Number or Email · `search_list` · text
- [button] Search
- [button] x
- **Send SMS**
- **SMS Body**
  - Keep your SMS short. · `text_sms_body` · textarea
- [button] Send SMS
- [button] Cancel
- [button] Submit
  - To · `dropdown` · select · options: All Data 📅, Today (08 October 2026 - 08 October 2026), This Month (01 October 2026 - 08 October 2026), Last Month (01 September 2026 - 30 September 2026), Last 3 Days (05 October 2026 - 08 October 2026), Last 7 Days (01 October 2026 - 08 October 2026), Last 15 Days (23 September 2026 - 08 October 2026), Last 30 Days (08 September 2026 - 08 October 2026), Custom (01 October 2026 - 08 October 2026)
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `membership_plan` · select · options: {64 people/records}
  - `services` · select · options: Select Service, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
  - `created_by` · select · options: {15 people/records}
  - `pay_method` · select · options: Select Payment Mode, CASH, ONLINE, Credit Card, Debit Card, PAYTM, Cheque, NEFT, Google Pay, PhonePay, Fitternity, PayPal, PayedApp, Razorpay, Paylater, Pay U, HDFC, Save In, UPI, Tabby, Tabby Card, Postpay, Tamara, Third party, Draft
  - `pay_status` · select · options: Status, Paid, Cancel
  - `client_rep` · select · options: {15 people/records}
  - `gender_filter` · select · options: Gender, Male, Female, Other
  - `sub_status` · select · options: Subscription Status, Active, Pending, Expired
  - `batch_filter` · select · options: Batch List, 5:00 AM - 6:30 AM, 5:30 AM - 7:00 AM, 6:00 AM - 7:30 AM, 6:30 AM - 8:00 AM, 7:00 AM - 8:30 AM, 7:30 AM - 9:00 AM, 8:00 AM - 9:30 AM, 8:30 AM - 10:00 AM, 9:00 AM - 10:30 AM, 9:30 AM - 11:00 AM, 10:00 AM - 11:30 AM, 8:00 PM - 9:30 PM, 10:30 AM - 12:00 PM, 5:00 PM - 6:30 PM, 5:30 PM - 7:00 PM, 6:00 PM - 7:30 PM, 6:30 PM - 8:00 PM, 7:00 PM - 8:30 PM, 7:30 PM - 9:00 PM, 8:30 PM - 10:00 PM, 4:30 PM - 6:00 PM, 2:00 PM - 3:30 PM, 2:30 PM - 4:00 PM, 3:00 PM - 4:30 PM … (+2)
- [button] Export to CSV
- [button] Back
- [button] Next

Pop-up: **Send SMS** — buttons: Send SMS, Cancel
  - Keep your SMS short. · `text_sms_body` · textarea

Opens: `/fitness-center/customer/make-payment/Customer-{id}/{id}/` · `/get_overall_reciept/NjM5NDE0MA/?&receipt_by= {id}` · `/get_overall_reciept/NjM5MzUzOQ/?&receipt_by= {id}` · `/get_overall_reciept/NjM2MzU4Mw/?&receipt_by= {id}` · `/get_overall_reciept/NjM1MDg3Mg/?&receipt_by= {id}` · `/get_overall_reciept/NjM0OTI4Mw/?&receipt_by= {id}` · `/get_overall_reciept/NjM0OTI2MQ/?&receipt_by= {id}`

#### Accounts › Account Registers › Recurring Payments Register

`/merchant/fitness-center/customers/recurring-subs-register/`

Headings: Recurring Payment RegisterListings
Columns: Invoice No. | Customer Name | Purchase Date | Plan Name | Start Date | End Date | Plan Status | Total Price | Total Balance Amount | Paid Price | Next Payable Amount | Next Payable Date | Action
Filter labels: From · Membership
Actions: Reset Password · Log Out · Search · Submit · Back · Next

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **Recurring Payment RegisterListings**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `membership_plan` · select · options: Select Membership
- [button] Back
- [button] Next

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

### Accounts › Payroll

#### Accounts › Payroll › Payroll Calculator

`/fitness-center/staff/payroll-sales/`

Headings: Payroll Calculator
Columns: Name of Employee | Paid Days | Present Days | Absent Days | Late Mark Days | Paid Leaves | Total Holidays | Basic salary | PT Commission Earned | Sales Commission Earned | Bonus Incentive | Deduction against Leave | Payable Salary
Actions: Reset Password · Log Out · Payroll Settings

Form 2:
- **Payroll Calculator**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - `check-all-box` · checkbox

Form 3:
- [button] x
- **Payroll Settings**
  - `trainer_grace_period` · text
  - `staff_grace_period` · text
- [button] Close
- [button] Submit

Pop-up: **Payroll Settings** — buttons: Submit
  - `trainer_grace_period` · text
  - `staff_grace_period` · text

#### Accounts › Payroll › Payroll Register

`/fitness-center/staff/payroll-register/`

Headings: Payroll Register
Columns: From/To Date | Name of Employee | Paid Days | Paid Date | Present Days | Absent Days | Late Mark Counts | Paid Leaves | Total Holidays | Basic salary | PT Commission Earned | Sales Commission Earned | Bonus Incentive | Deduction against Leave | Payable Salary
Actions: Reset Password · Log Out · Export to CSV

Form 2:
- **Payroll Register**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
- [button] Export to CSV
  - `check-all-box` · checkbox

### Accounts › Expense

#### Accounts › Expense › Expense List

`/fitness-centers/expense/`

Headings: Expense Listing
Columns: Expense Date | Expense title | Vendor Name | Category | GST No. | Payment Type | Payment Price | GST Price | Final Price | Note | Action
Filter labels: From
Actions: Reset Password · Log Out · View Expense Analysis · Search · Export to CSV · Submit · Delete · Add Expense

Form 2:
- [button] x
- **Add Expense**
- **Shaan Fitness Gym (Godari Gunta)**
- **Expense Details**
  - e.g. Posters for Diwali. · `expense_name` · text · required
  - `vendor` · select · options: Select a Vendor
  - `expense_category` · select · required · options: Select a Category, Salary, Electricity Bills, PT Incentives, Sales Incentives, Rent, Printing Stationary, Travelling, Misc expenses, Food bevarages, Tel Bills, Housekeeping, Advertisement, Service Tax paid, Repair maintenance, Assets Purchased, Income Tax Paid, Assets Purchased, Management Expense, Refund, Cash Handhover, Bonus, Advance Salary, PETTY CASH
  - dd-mm-yyyy · `expense_date` · date · required
  - `payment_type` · select · required · options: CASH, ONLINE, Credit Card, DebitCard, PAYTM, Cheque, NEFT, Google Pay, PhonePay, Fitternity
  - Enter the Expense Amount · `payment_price` · number · required
  - Enter the Expense GST Amount · `gst_price` · number · required
  - Enter the Final Expense Amount · `final_price` · number · required
  - Enter GST number, If Applicable · `gst_no` · text
  - e.g. Gave extra for Stationary. · `note` · textarea
- [button] Close
- [button] Add Expense

Form 3:
- **Expense Listing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search By Expense title, Vendor Name · `search_list` · text
- [button] Search
- [button] Export to CSV
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
- [button] Delete
- [button] Add Expense
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE SELECTED EXPENSE ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox

Form 4:
- [button] Delete
- [button] Add Expense

Pop-up: **Add Expense** — buttons: Add Expense
  - e.g. Posters for Diwali. · `expense_name` · text · required
  - `vendor` · select · options: Select a Vendor
  - `expense_category` · select · required · options: Select a Category, Salary, Electricity Bills, PT Incentives, Sales Incentives, Rent, Printing Stationary, Travelling, Misc expenses, Food bevarages, Tel Bills, Housekeeping, Advertisement, Service Tax paid, Repair maintenance, Assets Purchased, Income Tax Paid, Assets Purchased, Management Expense, Refund, Cash Handhover, Bonus, Advance Salary, PETTY CASH
  - dd-mm-yyyy · `expense_date` · date · required
  - `payment_type` · select · required · options: CASH, ONLINE, Credit Card, DebitCard, PAYTM, Cheque, NEFT, Google Pay, PhonePay, Fitternity
  - Enter the Expense Amount · `payment_price` · number · required
  - Enter the Expense GST Amount · `gst_price` · number · required
  - Enter the Final Expense Amount · `final_price` · number · required
  - Enter GST number, If Applicable · `gst_no` · text
  - e.g. Gave extra for Stationary. · `note` · textarea

Pop-up: **ARE YOU SURE YOU WANT TO DELETE SELECTED EXPENSE ?** — buttons: No

#### Accounts › Expense › Vendor List

`/fitness-centers/vendor-list/`

Headings: Vendor Listing
Columns: Vendor title | Contact Name | Contact Number 1 | Contact Number 2 | Note | GST No. | Fitness Center | Status | Action
Actions: Reset Password · Log Out · Search · Delete · Deactivate · Activate · Add Vendor

Form 2:
- [button] x
- **Add Vendor**
- **Shaan Fitness Gym (Godari Gunta)**
- **Vendor Details**
  - e.g. Tea Vendor. · `vendor_name` · text · required
  - Name of the Contact person · `contact_name` · text · required
  - Enter the Contact Number 1 · `contact_number_one` · text
  - Enter the Contact Number 2 · `contact_number_two` · text
  - Enter the Gst number. If Applicable · `gst_no` · text
  - e.g. Will serve 2 times a day Tea. · `note` · textarea
- [button] Close
- [button] Add Vendor

Form 3:
- **Vendor Listing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
- [button] Delete
- [button] Deactivate
- [button] Activate
- [button] Add Vendor
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE SELECTED VENDOR ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE SELECTED VENDOR ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE SELECTED VENDOR ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox

Pop-up: **Add Vendor** — buttons: Add Vendor
  - e.g. Tea Vendor. · `vendor_name` · text · required
  - Name of the Contact person · `contact_name` · text · required
  - Enter the Contact Number 1 · `contact_number_one` · text
  - Enter the Contact Number 2 · `contact_number_two` · text
  - Enter the Gst number. If Applicable · `gst_no` · text
  - e.g. Will serve 2 times a day Tea. · `note` · textarea

Pop-up: **ARE YOU SURE YOU WANT TO DELETE SELECTED VENDOR ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE SELECTED VENDOR ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE SELECTED VENDOR ?** — buttons: No

## Notification & WhatsApp

### Notification & WhatsApp › Notification

`/send-notification/`

Headings: Send Notification
Filter labels: Select Group Of User · Select Fitness Category · Message Title * · Message Body *
Actions: Reset Password · Log Out · Send Notification

Form 2:
  - `user_group` · select · options: {7 people/records}
  - `fitness_category` · select · options: All Categories, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
  - `message_title` · text · required
  - `message_body` · textarea · required
- [button] Send Notification

### Notification & WhatsApp › WhatsApp (Third Party)

#### Notification & WhatsApp › WhatsApp (Third Party) › QR Manager

`/improvised-unofficial-whatsapp/`

Headings: Unofficial WhatsApp Services · WhatsApp Connected · DISCLAIMER: This is an unofficial service powered by a third-party vendor. Use for transactional alerts only. · Test Functionality · How to Connect · System Linked · Knowledge Base
Filter labels: Mobile Number · Message Content
Actions: Reset Password · Log Out · Send Test Message · Logout WhatsApp

Form 2:
  - Mobile Number · `country_code` · text
  - Mobile Number · `mobile_no` · text · required
  - Mobile Number · `message_body` · textarea · required
- [button] Send Test Message

#### Notification & WhatsApp › WhatsApp (Third Party) › WhatsApp Settings

`/improvised-unofficial-whatsapp-settings/`

Headings: WhatsApp Settings
Filter labels: Birthday 04:00 AM · Balance Due 05:00 AM · On Expiry 08:00 AM · Before Expiry 06:00 AM · After Expiry 07:00 AM · Irregular Members 08:00 AM · Enquiry · Subscription Bill · Paid Balance · Auto Resend · Internationalization · Customized Bill Message · Dear · Hello · Respected · Hey · Greetings · Message Prefix · Message Suffix
Actions: Reset Password · Log Out · Save WhatsApp Settings

Form 2:
- **WhatsApp Settings**
- **Scheduled Automatic Messages**
  - Birthday 04:00 AM · `cron_settings` · checkbox
  - Balance Due 05:00 AM · `cron_settings` · checkbox
  - On Expiry 08:00 AM · `cron_settings` · checkbox
  - Before Expiry 06:00 AM · `cron_settings` · checkbox
  - After Expiry 07:00 AM · `cron_settings` · checkbox
  - Irregular Members 08:00 AM · `cron_settings` · checkbox
- **Event Triggered Messages**
  - Enquiry · `cron_settings` · checkbox
  - Subscription Bill · `cron_settings` · checkbox
  - Paid Balance · `cron_settings` · checkbox
- **Important WhatsApp Settings**
  - Auto Resend · `cron_settings` · checkbox
  - Internationalization · `cron_settings` · checkbox
  - Customized Bill Message · `cron_settings` · checkbox
- **Customer Salutation**
  - Dear · `customer_salutation` · radio
  - Hello · `customer_salutation` · radio
  - Respected · `customer_salutation` · radio
  - Hi · `customer_salutation` · radio
  - Hey · `customer_salutation` · radio
  - Greetings · `customer_salutation` · radio
- **Birthday Template**
  - Happy Birthday {cust_first_name} {cust_last_name} from {fitness_center_name} Family. · `birthday_message_template` · textarea
- **Irregular Members Template**
  - Hi {cust_first_name} {cust_last_name}, 

It has been long time you have visited our center. 

Please · `irregular_member_template` · textarea
- **New Enquiry Welcome Message Template**
  - Hi {cust_first_name} {cust_last_name},

Welcome to {fitness_center_name}!

Call: {fitness_center_pho · `enquiry_message_template` · textarea
- **Fully Customized Bill Creation Template**
  - Dear {cust_first_name} {cust_last_name}, Thanking you for subscribing {membership} for Rs. {total_am · `customized_bill_creation_message` · textarea
- **Subscription Bill Creation Message**
  - Feel free to contact us in case of any queries. · `suffix_bill_creation` · textarea
- **Before Expiry Message**
  - Renew Immediately to continue using the services. · `suffix_before_expiry` · textarea
- **After Expiry Message**
  - Renew Immediately to continue using the services. · `suffix_after_expiry` · textarea
- **On Day Of Expiry Message**
  - Renew Immediately to continue using the services. · `suffix_on_expiry` · textarea
- **Renewal Balance Due Message**
  - Renew Immediately to continue using the services. · `suffix_balance_due` · textarea
- **Balance Paid Message**
  - Thank you for your payment. · `suffix_paid_balance` · textarea
- [button] Save WhatsApp Settings

#### Notification & WhatsApp › WhatsApp (Third Party) › Messages History

`/improvised-unofficial-whatsapp-history/`

Headings: Unofficial WhatsApp Message History · Total Today · Success Today · Failed Today · Total (7 Days) · Success (7 Days) · Failed (7 Days)
Columns: Mobile | SOURCE | Status | Sent Time | Action
Filter labels: SOURCE · SENT DATE RANGE · DELIVERY STATUS
Actions: Reset Password · Log Out · Resend Selected · Resend Today · Resend Yesterday · Resend All Failed · View Message · Resend Message

Other fields:
  - `sourceFilter` · select · options: All Sources
  - Select dates... · `dateFilter` · text
  - `statusFilter` · select · options: All Statuses, ERROR, SUCCESS, FAILURE
  - `selectAll` · checkbox

### Notification & WhatsApp › SMS

#### Notification & WhatsApp › SMS › Balance & Recharge

`/sms-balance/`

Headings: DLT SMS Service Activation · Instant Setup · Cost Leader · 99.9% Delivery · SMS vs. Official WhatsApp · 999 · Activate Premium Services
Columns: Feature | DLT SMS | Official WhatsApp
Actions: Reset Password · Log Out

#### Notification & WhatsApp › SMS › SMS Settings

`/dlt-sms-settings/`

Headings: DLT SMS Service Activation · Instant Setup · Cost Leader · 99.9% Delivery · SMS vs. Official WhatsApp · 999 · Activate Premium Services
Columns: Feature | DLT SMS | Official WhatsApp
Actions: Reset Password · Log Out

#### Notification & WhatsApp › SMS › Send Bulk Messages

`/dlt-sms-send-bulk-message/`

Headings: DLT SMS Service Activation · Instant Setup · Cost Leader · 99.9% Delivery · SMS vs. Official WhatsApp · 999 · Activate Premium Services
Columns: Feature | DLT SMS | Official WhatsApp
Actions: Reset Password · Log Out

#### Notification & WhatsApp › SMS › Transactional SMS History

`/dlt-sms-message-history/`

Headings: DLT SMS Service Activation · Instant Setup · Cost Leader · 99.9% Delivery · SMS vs. Official WhatsApp · 999 · Activate Premium Services
Columns: Feature | DLT SMS | Official WhatsApp
Actions: Reset Password · Log Out

#### Notification & WhatsApp › SMS › Bulk Campaigns History

`/dlt-sms-message-bulk-history/`

Headings: DLT SMS Service Activation · Instant Setup · Cost Leader · 99.9% Delivery · SMS vs. Official WhatsApp · 999 · Activate Premium Services
Columns: Feature | DLT SMS | Official WhatsApp
Actions: Reset Password · Log Out

#### Notification & WhatsApp › SMS › Recharge History

`/dlt-sms-recharge-history/`

Headings: DLT SMS Service Activation · Instant Setup · Cost Leader · 99.9% Delivery · SMS vs. Official WhatsApp · 999 · Activate Premium Services
Columns: Feature | DLT SMS | Official WhatsApp
Actions: Reset Password · Log Out

### Notification & WhatsApp › Email

`/merchant/fitness-center/customers/customer-message-listing/`

Headings: Bulk EmailListing
Columns: Member Name & Number | Member Code | Gender | Added By
Filter labels: Members Status
Actions: Reset Password · Log Out · Search · Send Bulk Email

Other fields:
  - Search by Name or Mobile Number or Email · `search_list` · text
  - Members Status · `membership_status` · select · options: {5 people/records}

Pop-up: **Send Email** — buttons: Send Email
  - Make sure your title is short and explanatory. · `email_subject` · text
  - Description you provide should explain the notification clearly in short. · `email_body` · textarea

## Trainers

### Trainers › Add Trainer

`/fitness-center/trainer/basic-information/`

Headings: Trainer Basic Information · Working Days · Trainer Services · Trainer Profile Picture · Trainer Coach App Settings · Trainer Address
Filter labels: Trainer Name * · Trainer Email * · Trainer Password * · Mobile Number* · Emergency Contact Number · Date of Birth * · Gender * · Trainer Experience · Trainer Client Limit · Show Trainer in App · Trainer Service Type · Employee Type * · Category* · Trainer Profile Picture * · Allow Workout in Coach App · Allow Diet in Coach App · Allow Followups in Coach App · Allow Appointments in Coach App · Assign Subscription · View Subscription · View Membership Plan · Create Membership Plan · View Programs · Create Programs · View All Batches · View Self Batches · Create Self Batches · Create All Batches · Address · City · State · Country · Pincode
Actions: Reset Password · Log Out · Back · Save & Next · Save

Form 2:
  - First name · `trainer_first_name` · text · required
  - Last name · `trainer_last_name` · text · required
  - [redacted] · `email` · text · required
  - ******* · `password` · password · required
  - `country_code` · text
  - [redacted] · `mobileNo` · text · required
  - [redacted] · `emergency_phone_no` · text
  - `dob` · text · required
  - Male · `gender` · radio · required
  - Female · `gender` · radio · required
  - Other · `gender` · radio · required
  - `trainer_experience` · number
  - `trainer_client_limit` · number
  - Yes · `show_in_app` · radio
  - No · `show_in_app` · radio
  - `trainer_service_type` · select · options: Both Online & Offline, Only Online, Only Offline
  - Head Trainer / Nutritionist · `tt_type` · radio
  - Personal Trainer · `tt_type` · radio · required
  - General Trainer · `tt_type` · radio
  - Doctor · `tt_type` · radio
  - Zumba Instructor · `tt_type` · radio
  - Coach · `tt_type` · radio
  - Nutritionist · `tt_type` · radio
  - Massage therapist · `tt_type` · radio
  - Fitness manager · `tt_type` · radio
  - Yoga instructor · `tt_type` · radio
  - Dietitian · `tt_type` · radio
  - Counsellor · `tt_type` · radio
  - Dance Choreographer · `tt_type` · radio
  - MMA Professional · `tt_type` · radio
  - Music Instructor · `tt_type` · radio
  - Physiotherapy · `tt_type` · radio
  - Psychology · `tt_type` · radio
  - S & C Coach · `tt_type` · radio
  - Senior Head Coach · `tt_type` · radio
  - Lead Coach · `tt_type` · radio · required
  - Group Fitness Coach · `tt_type` · radio
  - Postnatal Fitness Coach · `tt_type` · radio
  - CrossFit Coach · `tt_type` · radio
  - Personal Training and Nutrition Coach · `tt_type` · radio · required
  - Pilates Teacher · `tt_type` · radio · required
  - Freelancer · `tt_type` · radio · required
- **Working Days**
- **Trainer Services**
  - Weight Training · `fitness_category` · checkbox · required
  - Cardio · `fitness_category` · checkbox · required
  - Cross-fit · `fitness_category` · checkbox · required
  - Personal Training / Nutrition · `fitness_category` · checkbox · required
  - Calisthenics · `fitness_category` · checkbox · required
  - HIIT · `fitness_category` · checkbox · required
  - Strength Training · `fitness_category` · checkbox · required
  - Group Activity · `fitness_category` · checkbox · required
  - Nutrition · `fitness_category` · checkbox · required
  - Steam · `fitness_category` · checkbox · required
  - Locker · `fitness_category` · checkbox · required
  - Free Body Weight · `fitness_category` · checkbox · required
- **Trainer Profile Picture**
  - `trainer_pic` · file
- **Trainer Coach App Settings**
  - Yes · `allow_workout` · radio
  - No · `allow_workout` · radio
  - Yes · `allow_diet` · radio
  - No · `allow_diet` · radio
  - Yes · `allow_followups` · radio
  - No · `allow_followups` · radio
  - Yes · `allow_appointments` · radio
  - No · `allow_appointments` · radio
  - Yes · `assign_subscription` · radio
  - No · `assign_subscription` · radio
  - Yes · `view_subscription` · radio
  - No · `view_subscription` · radio
  - Yes · `view_membership_plan` · radio
  - No · `view_membership_plan` · radio
  - Yes · `create_membership_plan` · radio
  - No · `create_membership_plan` · radio
  - Yes · `view_programs` · radio
  - No · `view_programs` · radio
  - Yes · `create_programs` · radio
  - No · `create_programs` · radio
  - Yes · `view_all_batches` · radio
  - No · `view_all_batches` · radio
  - Yes · `view_self_batches` · radio
  - No · `view_self_batches` · radio
  - Yes · `create_self_batches` · radio
  - No · `create_self_batches` · radio
  - Yes · `create_all_batches` · radio
  - No · `create_all_batches` · radio
- **Trainer Address**
  - Flat No., Building name · `street1` · text
  - Street, Area · `street2` · text
  - `city` · text
  - `state` · text
  - `country` · text
  - `pincode` · number
- [button] Back
- [button] Save & Next
- [button] Save

### Trainers › My Trainers

`/merchant/fitness-centers/trainers/`

Headings: My Trainers Listing (Max Limit : 1000)
Columns: Trainer Name | Trainer Type | Checkin Status | Email | Phone No. | Star Trainer | Status | Action
Actions: Reset Password · Log Out · Search · Deactivate · Activate · Add Time · Check Out · Check In · Add Trainer

Form 2:
- **My Trainers Listing (Max Limit : 1000)**
  - Enter the check in date and time : · `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Mobile Number or Email Address · `search_list` · text
- [button] Search
- [button] Log Out
- [button] Deactivate
- [button] Activate
- [button] x
- **Trainer Manual check In**
- **Add Check In & Check Out Time**
  - `manual_checkin_attendance` · text
  - `manual_checkout_attendance` · text
- [button] Cancel
- [button] Confirm
- [button] Add Time
- [button] Check Out
- [button] Check In
- [button] Add Trainer
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE SELECTED TRAINER ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE SELECTED TRAINER ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE SELECTED TRAINER ?**
- [button] Yes
- [button] No
- [button] ×
- **Delete Trainer**
  - Migrate to: · `migrateTrainerSelect` · select · options: {16 people/records}
- [button] Cancel
- [button] Delete & Migrate
- [button] ×
- **Copy Trainer(s) To Branch**
- [button] Cancel
- [button] Copy
- [button] ×
- **Import Trainer From Another Branch**
  - Search by name, email or phone · `importTrainerSearch` · text
- [button] Cancel
- [button] Import
  - `check-all-box` · checkbox

Pop-up: **Trainer Manual check In** — buttons: Cancel, Confirm
  - `manual_checkin_attendance` · text
  - `manual_checkout_attendance` · text

Pop-up: **ARE YOU SURE YOU WANT TO DELETE SELECTED TRAINER ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE SELECTED TRAINER ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE SELECTED TRAINER ?** — buttons: No

Pop-up: **Delete Trainer** — buttons: Cancel, Delete & Migrate
  - Migrate to: · `migrateTrainerSelect` · select · options: {16 people/records}

Pop-up: **Copy Trainer(s) To Branch** — buttons: Cancel, Copy

Pop-up: **Import Trainer From Another Branch** — buttons: Cancel, Import
  - Search by name, email or phone · `importTrainerSearch` · text

Opens: `/fitness-center/trainer/basic-information/Trainer-{id}/` · `/fitness-center/trainer/profile-view/Trainer-{id}/`

### Trainers › Manage Client Transformations

`/fitness-center/trainer/client-transformations/`

Headings: Manage Client Transformations
Columns: Transformation Image | Client Name | Durations | Description | Trainer Details | Action
Filter labels: Select Trainer
Actions: Reset Password · Log Out · Delete · Add Transformations · Edit

Form 2:
- **Manage Client Transformations**
  - Transformation Image · `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
- [button] x
- **ARE YOU SURE YOU WANT To DELETE SELECTED MEMBER ?**
- [button] Delete
- [button] No
- [button] Delete
- [button] Add Transformations
- [button] x
- **Upload Transformation**
  - `transformation_file` · file · required
  - Eg. John Doe · `client_name` · text · required
  - `transformation_period` · text · required
  - `transformation_unit` · select · required · options: Days, Weeks, Months, Year
  - `id_trainer` · select · required · options: {17 people/records}
  - Eg. Weight Loss · `transformation_title` · text · required
  - `transformation_description` · textarea · required
- [button] Submit
- [button] Cancel
- [button] x
- **Edit Transformation**
  - `edit_transformation_file` · file
  - Check to Delete image · `delete_img` · checkbox
  - Eg. John Doe · `edit_client_name` · text
  - `edit_transformation_period` · text
  - `edit_transformation_unit` · select · required · options: Days, Weeks, Months, Year
  - `edit_id_trainer` · select · options: {17 people/records}
  - Eg. Weight Loss · `edit_transformation_title` · text
  - `edit_transformation_description` · textarea
- [button] Submit
- [button] Cancel
  - Select Trainer · `trainer_assign_select` · select · options: {17 people/records}
  - `check-all-box` · checkbox
- [button] Edit
- [button] Edit
- [button] Edit
- [button] Edit

Pop-up: **ARE YOU SURE YOU WANT To DELETE SELECTED MEMBER ?** — buttons: Delete, No

Pop-up: **Upload Transformation** — buttons: Submit, Cancel
  - `transformation_file` · file · required
  - Eg. John Doe · `client_name` · text · required
  - `transformation_period` · text · required
  - `transformation_unit` · select · required · options: Days, Weeks, Months, Year
  - `id_trainer` · select · required · options: {17 people/records}
  - Eg. Weight Loss · `transformation_title` · text · required
  - `transformation_description` · textarea · required

Pop-up: **Edit Transformation** — buttons: Submit, Cancel
  - `edit_transformation_file` · file
  - Check to Delete image · `delete_img` · checkbox
  - Eg. John Doe · `edit_client_name` · text
  - `edit_transformation_period` · text
  - `edit_transformation_unit` · select · required · options: Days, Weeks, Months, Year
  - `edit_id_trainer` · select · options: {17 people/records}
  - Eg. Weight Loss · `edit_transformation_title` · text
  - `edit_transformation_description` · textarea

### Trainers › Trainer Leave Requests

`/fitness-center/trainer/leave-requests/`

Headings: Trainer Leave requests Listing
Columns: Trainer Name | Leave Start Date | Leave End Date | Leave Days | Requested Date | Leave Mode | Leave Type | Leave Status | Reason | Cancelled
Filter labels: Created Date · Leave mode · Leave Type · Leave status · Select Trainer
Actions: Reset Password · Log Out · Search · Reject · Approve as Un-paid · Approve as paid · Submit

Form 2:
- [button] x
- **Filters**
- **Members**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Member Status**
  - New Members · `new_members` · checkbox
  - New Inquires · `new_inquires` · checkbox
  - Active Members · `active_members` · checkbox
  - Inactive Members · `inactive_members` · checkbox
  - Never Checked-In · `nvr_checkedIn_members` · checkbox
  - Members Retained · `members_retained` · checkbox
- **Members by Age**
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
- **Members by Level**
  - Beginner · `member_level` · checkbox
  - Intermediate · `member_level` · checkbox
  - Advanced · `member_level` · checkbox
- **Bounced**
  - Bounced Members · `bounced_members` · checkbox
- [button] Close
- [button] Apply
- **Trainer Leave requests Listing**
  - Search by Mobile Number or Email Address · `search_list` · text
- [button] Search
- [button] Reject
- [button] Approve as Un-paid
- [button] Approve as paid
- [button] x
- **ARE YOU SURE YOU WANT TO REJECT SELECTED LEAVE ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO APPROVE AS UN-PAID SELECTED LEAVE ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO APPROVE AS PAID SELECTED LEAVE ?**
- [button] Yes
- [button] No
- [button] Submit
  - `leave_mode` · select · options: All, Full day, Morning half day, Evening half day
  - `leave_type` · select · options: All, Paid, Un-paid
  - `leave_status` · select · options: All, Pending, Approved, Rejected
  - Select Trainer · `trainer_assign_select` · select · options: {17 people/records}
  - `check-all-box` · checkbox

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - New Members · `new_members` · checkbox
  - New Inquires · `new_inquires` · checkbox
  - Active Members · `active_members` · checkbox
  - Inactive Members · `inactive_members` · checkbox
  - Never Checked-In · `nvr_checkedIn_members` · checkbox
  - Members Retained · `members_retained` · checkbox
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
  - Beginner · `member_level` · checkbox
  - Intermediate · `member_level` · checkbox
  - Advanced · `member_level` · checkbox
  - Bounced Members · `bounced_members` · checkbox

Pop-up: **ARE YOU SURE YOU WANT TO REJECT SELECTED LEAVE ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO APPROVE AS UN-PAID SELECTED LEAVE ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO APPROVE AS PAID SELECTED LEAVE ?** — buttons: No

## Fitness Center

### Fitness Center › My Fitness Centers

`/merchant/fitness-centers/`

Headings: My Fitness Centers Listing
Columns: Fitness Center Name | Services | Status | Address | Attendance Link | Action
Actions: Reset Password · Log Out · Search

Form 2:
  - Search · `search_list` · text
- [button] Search
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS FITNESS CENTER ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE THIS FITNESS CENTER ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE THIS FITNESS CENTER ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS FITNESS CENTER ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE THIS FITNESS CENTER ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE THIS FITNESS CENTER ?** — buttons: No

Opens: `/fitness-center/Fitness-Center-{id}/` · `/fitness-center/basic-information/Fitness-Center-{id}/`

### Fitness Center › Fitness Center Settings

`/fitness-center/app/settings/`

Headings: Fitness Center Settings Basic Information
Columns: Operations | Permissions | SMS Permissions
Actions: Reset Password · Log Out · Save

Form 2:
- **Fitness Center Settings Basic Information**
- [button] Save

### Fitness Center › Fitness Center Invoice Settings

`/fitness-center/overall/settings/`

Headings: Fitness Center Invoice Settings Basic Information · Invoice Settings · Receipt Settings
Filter labels: Invoice Type · Starting Number · Width of numeric part · Prefill with zero · Applicable From · Restart Number Every · Invoice Prefix · Invoice Suffix · Receipt Type · Receipt Starting Number · Receipt Width of numeric part · Receipt Prefill with zero · Receipt Applicable From · Receipt Restart Number Every · Receipt Prefix · Receipt Suffix
Actions: Reset Password · Log Out · Back · Save & Close · Save

Form 2:
- **Invoice Settings**
  - Automatic · `invoice_type` · radio
  - Manual · `invoice_type` · radio
  - Starting Number · `start_num` · number · default 1
  - `width_of_num` · number · default 5
  - Yes · `prefill_with_zero` · radio
  - No · `prefill_with_zero` · radio
  - `applicable_from` · text · required
  - `restrt_number_from` · select · options: Year, Month
  - e.g. YDL/ · `prefix` · text
  - e.g. /19-20 · `suffix` · text
- **Receipt Settings**
  - Automatic · `receipt_type` · radio
  - Manual · `receipt_type` · radio
  - Receipt Starting Number · `start_num_receipt` · number · default 1
  - `width_of_num_receipt` · number · default 5
  - Yes · `prefill_with_zero_receipt` · radio
  - No · `prefill_with_zero_receipt` · radio
  - `applicable_from_receipt` · text
  - `restrt_number_from_receipt` · select · options: Year, Month
  - e.g. YDL/ · `prefix_receipt` · text
  - e.g. /19-20 · `suffix_receipt` · text
- [button] Back
- [button] Save & Close
- [button] Save

### Fitness Center › Fitness Center Biometric Manager

`/fitness-centers/biometric-manager/`

Headings: Shaan Fitness Gym (Godari Gunta) · Clients with Expired Membership · Client with About to Expire Membership · Client with Balance Payments · Filters · Expected Payments (Total Payments: 0, Total Amount: 0) · My Follow Up Total Follow Ups (0) · Missed Follow-ups(137) · Today's Batches () Batchwise Attendance · Today's Collection · Current Month's Collection · Current Year's Collection
Columns: Type | Name & Number | Assign/Schedule by | To Do | Expected Date | Expected Amount | Action
Columns: Type | Name & Number | Follow up Date | Assign/Schedule by | To Do | Convertibility | Action
Columns: Type | Name & Number | Follow up Date | Assign/Schedule by | To Do | Convertibility | Action | Follow Up Date | Follow Up Assign to | Follow Up Type | Comment | Expected Date | Expected Amount
Columns: Follow Up Date | Follow Up Assign to | Follow Up Type | Comment
Columns: Follow Up Date | Follow Up Assign to | Follow Up Type | Comment | Expected Date | Expected Amount
Columns: Follow Up Date | Follow Up Assign to | Follow Up Type | Comment | Expected Date
Columns: Batch Name | Conducted By | Time | Total Check-ins | Active | Expired | Membership Not Assigned | Action
Filter labels: From
Cards: Today's Collection · Current Month's Collection · Current Year's Collection · Balance Amount · Active Gym Subscriptions · Expired Gym Subscriptions · Total Open Enquiries · Total Active Members · Present Check-ins · Live App Installs · Active PT Subscriptions · Expired PT Subscriptions
Actions: Reset Password · Log Out · View Clients · Submit · See All Follow Ups · See all Missed Follow-ups · Actions · Follow up Response · Follow Up History · See Traffic Insights · View all

Form 2:
- **Filters**
- [button] Submit
  - To · `dropdown` · select · options: Today (08 October 2026), Last 3 Days (05 October 2026 - 08 October 2026), Next 3 Days (08 October 2026 - 11 October 2026), Next 7 Days (08 October 2026 - 15 October 2026), Next 15 Days (08 October 2026 - 23 October 2026), Custom (08 October 2026 - 08 October 2026)
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `staff_assign_select` · select · options: {7 people/records}
- **Expected Payments (Total Payments: #, Total Amount: 0)**
  - `followup_type` · select · options: Select Follow Up Type, Membership Renewal, Balance due, Freeze, Assign Trial, PT Renewal, PT Trial, Referral, Transfer, Upgrade, Online Prospect(Non gym), Online Training, Trial Online PT, Ready To Sign Up, Demo Scheduled, Demo Conducted, Confirmation Calls, Gym/Studio Trial, Other
- **My Follow Up Total Follow Ups (#)**
  - `my_followup_type` · select · options: Select Follow Up Type, Membership Renewal, Enquiry, RE-Enquiry, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Online Prospect(Non gym), Online Training, Trial Online PT, Trial Online PT Feedback, Ex-Member, Ready To Sign Up, Demo Scheduled, Demo Conducted, Confirmation Calls, Gym/Studio Trial … (+1)
  - `convert_select` · select · options: Select Convertibility, Hot, Warm, Cold

Other fields:
  - `missed_followup_staff_select` · select · options: {7 people/records}
  - `dropdown_missed_followups` · select · options: Yesterday (07 October 2026), Last 30 days (08 September 2026 - 07 October 2026), Last 60 days (09 August 2026 - 07 October 2026)
  - To · `dropdown_batch` · select · options: Today (08 October 2026), Last 3 Days (05 October 2026 - 08 October 2026), Last 7 Days (01 October 2026 - 08 October 2026), Last 15 Days (23 September 2026 - 08 October 2026), Last Month (08 September 2026 - 08 October 2026), Custom (08 October 2026 - 08 October 2026)
  - `batch_end_picker_date` · text
  - `batch_start_picker_date` · text

Pop-up: **Schedule Follow Up** — buttons: Cancel
  - `call_rep` · select · options: {8 people/records}
  - `followup_date` · text
  - Assign To * · `employee_select` · select · options: {7 people/records}
  - Convertibility * · `lead_type` · select · required · options: Hot, Warm / Maybe, Cold / Not so interested, Expected, Unpitched
  - `expected_date` · date
  - `expected_amt` · number
  - `followup_notes` · textarea
  - `quick_msg` · select · options: Quick Message, Not reachable, No answer, Waiting, Busy, Incorrect, Interested, Switch Off, Call, JOINING CALL, COURTESY CALL, Call Again, JOINING CALL, COURTESY CALL, Inquired but did not ask for payment, Inquired & Payment link sent or to be sent., Call later same day or tomorrow or some other month, Costly Can not afford, Phone Cut, Half Call.Call again, Not Interested, Inquired by mistake, Joined Somewhere else, Other
  - `contact_type` · select · required · options: Phone, In Person, Email, Whatsapp, SMS
  - `followup_comment` · textarea
  - `my_followup_type` · select · options: All Followup, Membership Renewal, Enquiry, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Online Prospect(Non gym), Online Training, Trial Online PT, Trial Online PT Feedback, Nutrition, Confirmation Calls, Gym/Studio Trial, Other

Opens: `/merchant/fitness-center/customers/follow-up-list/?is_apply_filer=1&cust_followup_type=Missed_Followup&start_date={id}-08-09&end_date={id}-10-07` · `/merchant/fitness-center/customers/follow-up-list/?is_apply_filer=1&cust_followup_type=Missed_Followup&
                       &start_date={id}-08-09&end_date={id}-10-07
                       ` · `/fitness-center/customer/folloup-history/Customer-{id}/0/` · `/fitness-center/customer/subscriptions/Customer-{id}/0/` · `/merchant/fitness-center/customers/payments/?is_apply_filer=1&paymnt_status=PI&start_date={id}-10-08&end_date={id}-10-08` · `/merchant/fitness-center/customers/expiry-membership-resgister/?screen_type=SCREEN&sub_type=gym&start_date={id}-01-01&end_date={id}-10-08`

### Fitness Center › Extended Biometric Manager

`/fitness-centers/extended-biometric-manager/`

Headings: Fitness Center Biometric Manager Manage Your Biometric Device Here
Actions: Reset Password · Log Out · Back · FC Biometric Settings · Biometric Device Operations · Add Biometric Device · Edit Device · Delete Device

Form 2:
- [button] FC Biometric Settings
- [button] x
- **FITNESS CENTER EXTENDED BIOMETRIC SETTINGS (NEW)**
  - YES · `block_users_expired` · radio · required
  - NO · `block_users_expired` · radio
  - Alternate · `checkout_mode` · radio · required
  - System Direction · `checkout_mode` · radio
  - YES · `block_users_balance` · radio · required
  - NO · `block_users_balance` · radio
  - YES · `block_users_freeze` · radio · required
  - NO · `block_users_freeze` · radio
  - YES · `record_customer_checkout` · radio · required
  - NO · `record_customer_checkout` · radio
  - [person] · `stop_staff_duplicate_checkin` · radio
  - [person] · `stop_staff_duplicate_checkin` · radio
  - [person] · `stop_trainer_duplicate_checkin` · radio
  - [person] · `stop_trainer_duplicate_checkin` · radio
  - YES · `personal_training_filter` · radio · required
  - NO · `personal_training_filter` · radio
  - `checkout_time` · number · required · default 90
  - `alert_email_address` · email
- [button] Close
- [button] Save Biometric Settings

Form 3:
- [button] Biometric Device Operations
- [button] x
- **PERFORM DEVICE OPERATIONS**
  - `device_list` · select · required · options: Select Devices, [redacted]
  - `device_operation` · select · required · options: Select Device Operation, Clear Logs From Device, Restart Biometric Device, Reset OP Stamp, Unblock Active Members
- [button] Close
- [button] Perform Operations On Device

Form 4:
- [button] Add Biometric Device
- [button] x
- **ADD BIOMETRIC DEVICE (YDL CRM)**
  - `device_name` · text · required
  - `device_serial` · text · required
  - Customers · `storage_type` · checkbox
  - Trainers · `storage_type` · checkbox
  - Staff Members · `storage_type` · checkbox
  - Finger · `device_type` · radio
  - Face · `device_type` · radio
  - Face & Finger · `device_type` · radio
  - Applicable · `expiry_rule` · radio
  - Not Applicable · `expiry_rule` · radio
  - `device_server` · select · options: ESSL (E-TIME TRACK LITE SERVER) - (68.178.160.159 : 80)
- [button] Close
- [button] Add Biometric Device

Form 5:
- [button] Edit Device
- [button] x
- **UPDATE BIOMETRIC DEVICE (YDL CRM)**
- [button] Close
- [button] Update Biometric Device
- [button] Delete Device
- [button] x
- **DELETE BIOMETRIC DEVICE (YDL CRM)**
- [button] Close
- [button] Delete Biometric Device

Pop-up: **FITNESS CENTER EXTENDED BIOMETRIC SETTINGS (NEW)** — buttons: Save Biometric Settings
  - YES · `block_users_expired` · radio · required
  - NO · `block_users_expired` · radio
  - Alternate · `checkout_mode` · radio · required
  - System Direction · `checkout_mode` · radio
  - YES · `block_users_balance` · radio · required
  - NO · `block_users_balance` · radio
  - YES · `block_users_freeze` · radio · required
  - NO · `block_users_freeze` · radio
  - YES · `record_customer_checkout` · radio · required
  - NO · `record_customer_checkout` · radio
  - [person] · `stop_staff_duplicate_checkin` · radio
  - [person] · `stop_staff_duplicate_checkin` · radio
  - [person] · `stop_trainer_duplicate_checkin` · radio
  - [person] · `stop_trainer_duplicate_checkin` · radio
  - YES · `personal_training_filter` · radio · required
  - NO · `personal_training_filter` · radio
  - `checkout_time` · number · required · default 90
  - `alert_email_address` · email

Pop-up: **PERFORM DEVICE OPERATIONS** — buttons: Perform Operations On Device
  - `device_list` · select · required · options: Select Devices, [redacted]
  - `device_operation` · select · required · options: Select Device Operation, Clear Logs From Device, Restart Biometric Device, Reset OP Stamp, Unblock Active Members

Pop-up: **ADD BIOMETRIC DEVICE (YDL CRM)** — buttons: Add Biometric Device
  - `device_name` · text · required
  - `device_serial` · text · required
  - Customers · `storage_type` · checkbox
  - Trainers · `storage_type` · checkbox
  - Staff Members · `storage_type` · checkbox
  - Finger · `device_type` · radio
  - Face · `device_type` · radio
  - Face & Finger · `device_type` · radio
  - Applicable · `expiry_rule` · radio
  - Not Applicable · `expiry_rule` · radio
  - `device_server` · select · options: ESSL (E-TIME TRACK LITE SERVER) - (68.178.160.159 : 80)

Pop-up: **UPDATE BIOMETRIC DEVICE (YDL CRM)** — buttons: Update Biometric Device
  - `update_device_name` · text · required
  - `update_device_serial` · text · required
  - Customers · `update_storage_type` · checkbox
  - Trainers · `update_storage_type` · checkbox
  - Staff Members · `update_storage_type` · checkbox
  - Finger · `update_device_type` · radio
  - Face · `update_device_type` · radio
  - Face Ex · `update_device_type` · radio
  - Face & Finger · `update_device_type` · radio
  - Applicable · `update_expiry_rule` · radio
  - Not Applicable · `update_expiry_rule` · radio
  - `update_device_server` · select · options: ESSL (E-TIME TRACK LITE SERVER) - (68.178.160.159 : 80)

Pop-up: **DELETE BIOMETRIC DEVICE (YDL CRM)** — buttons: Delete Biometric Device
  - `delete_device_name` · text · required
  - `delete_device_serial` · text · required
  - Customers · `delete_storage_type` · checkbox
  - Trainers · `delete_storage_type` · checkbox
  - Staff Members · `delete_storage_type` · checkbox
  - Finger · `delete_device_type` · radio
  - Face · `delete_device_type` · radio
  - Face & Finger · `delete_device_type` · radio
  - Applicable · `delete_expiry_rule` · radio
  - Not Applicable · `delete_expiry_rule` · radio
  - `delete_device_server` · select · options: None, ESSL (E-TIME TRACK LITE SERVER) - (68.178.160.159 : 80)

### Fitness Center › Fitness Center DLT OTP Manager

`/fitness-centers/dlt-otp-manager/`

Headings: FITNESS CENTER DLT (DISTRIBUTED LEDGER TECHNOLOGY) OTP SMS / VOICE MANAGER
Filter labels: DLT OPERATOR · DLT PRINCIPAL ENTITY ID · DLT SMS HEADER ID · DLT SMS TEMPLATE ID · VENDOR OTP TEMPLATE ID · VENDOR AUTH API KEY · CUSTOMER APP NAME · CUSTOMER APP 11 DIGIT HASH · TRAINER APP NAME · TRAINER APP 11 DIGIT HASH · OTP LENGTH · OTP EXPIRY TIME (IN MINUTES) · DLT SENDER ID · DLT OTP MESSAGE · ENABLE WHATSAPP OTP · FIREBASE · TRUECALLER · INTERNATIONAL OTP
Actions: Reset Password · Log Out · Save

Form 2:
  - `dlt_operator` · select · options: *** (RECOMMENDED) VIL POWER - VODAFONE IDEA DLT (https://www.vilpower.in/), AIRTEL DLT (https://dltconnect.airtel.in/), BSNL DLT (https://www.ucc-bsnl.co.in/), MTNL DLT (https://www.ucc-mtnl.in/), TRUE CONNECT - JIO DLT (https://trueconnect.jio.com/), TATA DLT (https://telemarketer.tatateleservices.com:8082/), SMART PING - VIDEOCON DLT (https://smartping.live/)
  - `principal_entity_id` · number · required
  - `sms_header_id` · number · required
  - `sms_template_id` · number · required
  - `vendor_otp_template_id` · text
  - `vendor_auth_api_key` · text
  - `customer_app_name` · text · required
  - `customer_app_hash` · text · required
  - `trainer_app_name` · text · required
  - `trainer_app_hash` · text · required
  - `otp_length` · range · default 6
  - `otp_expiry_time` · range · default 10
  - `sender_id` · text · required
  - `otp_message` · textarea · required
  - Yes · `whatsapp_otp` · radio
  - No · `whatsapp_otp` · radio
  - Yes · `firebase` · radio
  - No · `firebase` · radio
  - Yes · `true_caller` · radio
  - No · `true_caller` · radio
  - Yes · `allow_abroad_otp` · radio
  - No · `allow_abroad_otp` · radio
- [button] Save

### Fitness Center › Fitness Center Email Manager

`/fitness-centers/email-manager/`

Headings: FITNESS CENTER EMAIL MANAGER
Filter labels: HOSTNAME · PORT · EMAIL SECURITY · SENDER MAIL · SENDER PASSWORD · SENDER NAME · TEST MAIL
Actions: Reset Password · Log Out · Save · Send Test Mail

Form 2:
  - `hostname` · text · required
  - `port` · number · required · default 587
  - `security` · select · options: SSL (465), TLS (587)
  - `username` · email · required
  - `password` · text · required
  - `sender_name` · text · required
- [button] Save
  - `test_mail` · email
- [button] Send Test Mail

### Fitness Center › Fitness Center Holiday

`/fitness-centers/events/`

Headings: Fitness Center Holiday Listing
Columns: Date | Event title | Event Type | Wish Text | Declared Holiday | Send Wish | Active | Action
Actions: Reset Password · Log Out · Search · Delete · Deactivate · Activate · Send Notification · Add Holiday

Form 2:
- [button] x
- **Add Event Notice**
- **Shaan Fitness Gym (Godari Gunta)**
- **Date & Time**
  - `event_date` · text
- **Event**
  - Make sure your title is short and explanatory. · `event_name` · text · required
- **Type**
  - `holiday_group_id` · select · options: PUBLIC HOLIDAY, GOVERMENT HOLIDAY, GYM HOLIDAY
  - `user_group_id` · select · options: Customer
  - Yes · `holiday` · radio · required
  - No · `holiday` · radio · required
  - Yes · `wish` · radio · required
  - No · `wish` · radio · required
- **Wish Text**
  - Description you provide should explain the notice clearly. · `event_description` · textarea
- [button] Close
- [button] Add Holiday

Form 3:
- **Fitness Center Holiday Listing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
- [button] Delete
- [button] Deactivate
- [button] Activate
- [button] Send Notification
- [button] Add Holiday
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS NOTICE ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE THIS NOTICE ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE THIS NOTICE ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox

Pop-up: **Add Event Notice** — buttons: Add Holiday
  - `event_date` · text
  - Make sure your title is short and explanatory. · `event_name` · text · required
  - `holiday_group_id` · select · options: PUBLIC HOLIDAY, GOVERMENT HOLIDAY, GYM HOLIDAY
  - `user_group_id` · select · options: Customer
  - Yes · `holiday` · radio · required
  - No · `holiday` · radio · required
  - Yes · `wish` · radio · required
  - No · `wish` · radio · required
  - Description you provide should explain the notice clearly. · `event_description` · textarea

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS NOTICE ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE THIS NOTICE ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE THIS NOTICE ?** — buttons: No

### Fitness Center › Equipment

#### Fitness Center › Equipment › Equipment List

`/fitness-center/equipment/list/`

Headings: Equipment Listing
Columns: Equipment Name | Serial Number | Purchase Date | Status | Action
Filter labels: From Date · To Date · Status
Actions: Reset Password · Log Out · Search · Add Equipment · Submit

Form 2:
  - Search by Equiptment Name or Serial Number · `search_list` · text
- [button] Search

Form 3:
- [button] Submit
  - `from_date` · text
  - `to_date` · text
  - `status` · select · options: All, Working, Faulty, Inactive

Other fields:
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)

Pop-up: **Add Equipment** — buttons: Add Equipment
  - `name` · text · required
  - `serial_number` · text · required
  - Status * · `status` · select · options: Working, Faulty, Inactive
  - Purchase Date * · `date` · date · required

### Fitness Center › Notices & Rules

#### Fitness Center › Notices & Rules › Notices

`/fitness-centers/notices/`

Headings: Notices Listing
Columns: Notice title | Fitness Center | Status | Action
Actions: Reset Password · Log Out · Search · Delete · Deactivate · Activate · Send Notification · Add Notice

Form 2:
- [button] x
- **Add Notice**
- **Shaan Fitness Gym (Godari Gunta)**
- **Notice**
  - Make sure your title is short and explanatory. · `notice_name` · text · required
- **Notice Description**
  - Description you provide should explain the notice clearly. · `notice_description` · textarea · required
  - `user_group_id` · select · options: Customer, Trainer
- [button] Close
- [button] Add Notice

Form 3:
- **Notices Listing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
- [button] Delete
- [button] Deactivate
- [button] Activate
- [button] Send Notification
- [button] Add Notice
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS NOTICE ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE THIS NOTICE ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE THIS NOTICE ?**
- [button] Yes
- [button] No
- [button] x
- **Edit Notice**
- **Shaan Fitness Gym (Godari Gunta)**
- **Notice**
  - Make sure your title is short and explanatory. · `notice_name_412` · text · required
- **Notice Description**
  - Description you provide should explain the notice clearly. · `notice_description_412` · textarea · required
- [button] Close
- [button] Edit Notice
- [button] x
- **... repeated once per row (3 rows on the page)**

Pop-up: **Add Notice** — buttons: Add Notice
  - Make sure your title is short and explanatory. · `notice_name` · text · required
  - Description you provide should explain the notice clearly. · `notice_description` · textarea · required
  - `user_group_id` · select · options: Customer, Trainer

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS NOTICE ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE THIS NOTICE ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE THIS NOTICE ?** — buttons: No

Pop-up: **Edit Notice** — buttons: Edit Notice
  - Make sure your title is short and explanatory. · `notice_name_412` · text · required
  - Description you provide should explain the notice clearly. · `notice_description_412` · textarea · required

#### Fitness Center › Notices & Rules › Rules

`/fitness-centers/rules/`

Headings: Rules Listing
Columns: Rule title | Fitness Center | Status | Action
Actions: Reset Password · Log Out · Search · Delete · Deactivate · Activate · Add rule

Form 2:
- [button] x
- **Add a Rule**
- **Shaan Fitness Gym (Godari Gunta)**
- **Rule**
  - Make sure your title is short and explanatory. · `rule_name` · text · required
- **Rule Description**
  - Explain your rule in short. · `rule_description` · textarea · required
- [button] Close
- [button] Add Rule

Form 3:
- **Rules Listing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
- [button] Delete
- [button] Deactivate
- [button] Activate
- [button] Add rule
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS RULE ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE THIS RULE ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE THIS RULE ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox

Pop-up: **Add a Rule** — buttons: Add Rule
  - Make sure your title is short and explanatory. · `rule_name` · text · required
  - Explain your rule in short. · `rule_description` · textarea · required

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS RULE ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE THIS RULE ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE THIS RULE ?** — buttons: No

### Fitness Center › Currency Setting

`/fitness-centers/change-currency/`

Headings: Currency Support Apply
Filter labels: Choose Currency * · Tax Name
Actions: Reset Password · Log Out · Apply Currency

Form 2:
  - `currency_select` · select · required · options: Select Currency, Default (₹), US (USD) ($), SWISS (CHF) (CHF), EURO (EUR) (€), UAE (AED) (د.إ.‏), Seychelles (SCR) (SCR), Kuwait (KWD) ( KD ), Moroccan (MAD) (د.م.‏), Oman Rial (OMR) (ر.ع.‏), Qatari riyal (QAR) (ر.ق.‏), Pakistan (PKR) (₨), Lebanon (LBP) (ل.ل.‏), Singapore (SGD) ($), Saudi Riyal (SAR) (ر.س.‏), Thailand (THB) (฿), Bahraini (BHD) (د.ب.‏), Malaysian ringgit (MYR) (RM), London (GBP) (£), Nepal (NPR) (नेरू), Philippines (PHP) (₱), Congo (CDF) (FC), Algerian Dinar (DZD) (د.ج.‏), Mozambique (MZN) (MT), Kenya (KES) (KSh) … (+2)
  - e.g. GST,Tax · `tax` · text
- [button] Apply Currency

### Fitness Center › Feedback

`/fitness-centers/feedback/`

Headings: Feedback Listing
Columns: Feedback No. | Customer Name | Date & Time | Customer Email | Feedback
Actions: Reset Password · Log Out · Export to CSV · Back · Next

Form 2:
- **Feedback Listing**
- [button] Export to CSV
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

Opens: `/fitness-center/customer/Customer-{id}/`

## Staff

### Staff › Add Staff Account

`/fitness-center/account/basic-information/`

Headings: Staff Account Basic Information · Allowed Fitness Centers · Allowed Ecommerce Stores · Working Days · Staff Profile Picture · Staff Payroll · Account Address
Filter labels: Staff Name * · Staff Email * · Staff Password * · Mobile Number * · Emergency Contact Number · Date of Birth * · Gender * · Employee Type * · Designation * · Allow Discounting * · Can see only his clients * · Auto Allocate Leads * · Fitness Centers* · Stores* · Staff Profile Picture * · Basic Pay/Salary · Deduct Salary for absent · Late Penalty · Address · City · State · Country · Pincode
Actions: Reset Password · Log Out · Back · Save & Close · Save

Form 2:
  - First name · `account_first_name` · text · required
  - Last name · `account_last_name` · text · required
  - [redacted] · `email` · text · required
  - ******* · `password` · password · required
  - `country_code` · text
  - [redacted] · `mobileNo ` · text · required
  - [redacted] · `emergency_phone_no` · text
  - `dob` · text · required
  - Male · `gender` · radio · required
  - Female · `gender` · radio · required
  - Other · `gender` · radio · required
  - Owner · `ac_type` · radio · required
  - Manager/General Manager · `ac_type` · radio · required
  - Floor Manager/Fitness Manager · `ac_type` · radio · required
  - Admin · `ac_type` · radio · required
  - Sales · `ac_type` · radio · required
  - Front Desk Executive · `ac_type` · radio · required
  - Support Staff/Helper · `ac_type` · radio · required
  - Sales Manager · `ac_type` · radio · required
  - HR · `ac_type` · radio · required
  - [person] · `staff_des` · radio
  - [person] · `staff_des` · radio
  - [person] · `staff_des` · radio
  - [person] · `staff_des` · radio
  - [person] · `staff_des` · radio
  - [person] · `staff_des` · radio
  - [person] · `staff_des` · radio
  - Yes · `allow_discounting` · radio
  - No · `allow_discounting` · radio
  - Yes · `only_his_clients` · radio
  - No · `only_his_clients` · radio
  - Yes · `auto_lead_clients` · radio
  - No · `auto_lead_clients` · radio
- **Allowed Fitness Centers**
  - Shaan Fitness Gym · `allow_fitness_center` · checkbox · required
- **Allowed Ecommerce Stores**
  - Nutra Sage · `allow_fitness_stores` · checkbox
- **Working Days**
- **Staff Profile Picture**
  - `trainer_pic` · file
- **Staff Payroll**
  - `basic_pay` · number
  - `pay_acc_to_duration` · select · options: Per Month, Per Week, Per Day
  - Deduct Salary for Absent · `deducted_salary_for_absent` · checkbox
  - `late_penalty_amt` · number
- **Account Address**
  - Flat No., Building name · `street1` · text
  - Street, Area · `street2` · text
  - `city` · text
  - `state` · text
  - `country` · text
  - `pincode` · number
- [button] Back
- [button] Save & Close
- [button] Save

### Staff › Staff List

`/merchant/fitness-centers/accounts/`

Headings: Staff Accounts Listing
Columns: Account Name | Staff Id | Account Type | Checkin Status | Email | Phone No. | Status | Action
Actions: Reset Password · Log Out · Search · Deactivate · Activate · Add Time · Check Out · Check In · Add Staff

Form 2:
- **Staff Accounts Listing**
  - Enter the check in date and time : · `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Mobile Number or Email Address · `search_list` · text
- [button] Search
- [button] Deactivate
- [button] Activate
- [button] x
- **Staff Manual check In**
- **Add Check In & Check Out Time**
  - `manual_checkin_attendance` · text
  - `manual_checkout_attendance` · text
- [button] Cancel
- [button] Confirm
- [button] Add Time
- [button] Check Out
- [button] Check In
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE THE SELECTED STAFF ACCOUNT ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE THE SELECTED STAFF ACCOUNT ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox

Pop-up: **Staff Manual check In** — buttons: Cancel, Confirm
  - `manual_checkin_attendance` · text
  - `manual_checkout_attendance` · text

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE THE SELECTED STAFF ACCOUNT ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE THE SELECTED STAFF ACCOUNT ?** — buttons: No

Opens: `/merchant/fitness-centers/accounts-view/owner_{id}/` · `/fitness-center/account/basic-information/Owner-{id}/` · `/merchant/fitness-centers/accounts-view/Owner-{id}/`

### Staff › Staff Access Control

`/merchant/fitness-centers/accounts-access-control/`

Headings: Staff Accounts Access Control Listing
Columns: Operations/Employee | Manager/General Manager | Floor Manager/Fitness Manager | Front Desk Executive | Sales | Helper | Sales Manager | Admin | HR | Enquiry & Follow Ups Note: Client Rep Field is only editable for Gym Owner/Manager regardless of any permission given
Columns: Branch Name | Location | Same Setting Like
Actions: Reset Password · Log Out · Select Branch · Save & Close · Save

Form 2:
- **Staff Accounts Access Control Listing**
- [button] Save & Close
- [button] Save
- [button] x
- **Select Branch**
  - Search Branch/Location... · `searchInput` · text
- ***Selected Branch**
  - `check-all-box` · checkbox
- [button] Done

Pop-up: **Select Branch** — buttons: Done
  - Search Branch/Location... · `searchInput` · text
  - `center_id` · checkbox
  - `check-all-box` · checkbox

### Staff › Staff/Trainer Target

`/merchant/fitness-centers/staff-trainer-target/`

Headings: Staff/Trainer Target Info
Columns: Staff/Trainer Name | Target 1 | Target 2 | Target 3 | Target 4 | Target 5 | Target Month/Year | Assigned Date | Action
Actions: Reset Password · Log Out · Search · Add Target · Delete · Back · Next

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **Staff/Trainer Target Info**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Name or ID · `search_list` · text
- [button] Search
  - `staff_trainer_selectt` · select · options: {23 people/records}
  - `month_filter` · select · options: All Months, JANUARY, FEBRUARY, MARCH, APRIL, MAY, JUNE, JULY, AUGUST, SEPTEMBER, OCTOBER, NOVEMBER, DECEMBER
- [button] x
- **ADD NEW TARGET**
- **Assign Target**
  - `staff_trainer_select` · select · required · options: {22 people/records}
  - Jan · `target_month[]` · checkbox
  - Feb · `target_month[]` · checkbox
  - Mar · `target_month[]` · checkbox
  - Apr · `target_month[]` · checkbox
  - May · `target_month[]` · checkbox
  - Jun · `target_month[]` · checkbox
  - Jul · `target_month[]` · checkbox
  - Aug · `target_month[]` · checkbox
  - Sep · `target_month[]` · checkbox
  - Oct · `target_month[]` · checkbox
  - Nov · `target_month[]` · checkbox
  - Dec · `target_month[]` · checkbox
  - Select All · `selectAll` · checkbox
  - `target_year` · select · required · options: 2024, 2025, 2026, 2027
  - `target_type_select` · select · options: Select Target Type, Personal Training, General Training, Both, New Personal Training, New General Training, Renew Personal Training, Renew General Training
  - `commission_type_select` · select · options: Select Commission Type, Flat Value, Percentage
- **Please Assign Target Amount In Ascending Order**
  - Target 1 · `target_1` · text · required
  - eg.123 · `commission_target_1` · text
  - Target 2 · `target_2` · text
  - eg.123 · `commission_target_2` · text
  - Target 3 · `target_3` · text
  - eg.123 · `commission_target_3` · text
  - Target 4 · `target_4` · text
  - eg.123 · `commission_target_4` · text
  - Target 5 · `target_5` · text
  - eg.123 · `commission_target_5` · text
- [button] Close
- [button] Add Target New
- [button] Add Target
- [button] Delete
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS STAFF/TRAINER ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

Pop-up: **ADD NEW TARGET** — buttons: Add Target New
  - `staff_trainer_select` · select · required · options: {22 people/records}
  - Jan · `target_month[]` · checkbox
  - Feb · `target_month[]` · checkbox
  - Mar · `target_month[]` · checkbox
  - Apr · `target_month[]` · checkbox
  - May · `target_month[]` · checkbox
  - Jun · `target_month[]` · checkbox
  - Jul · `target_month[]` · checkbox
  - Aug · `target_month[]` · checkbox
  - Sep · `target_month[]` · checkbox
  - Oct · `target_month[]` · checkbox
  - Nov · `target_month[]` · checkbox
  - Dec · `target_month[]` · checkbox
  - Select All · `selectAll` · checkbox
  - `target_year` · select · required · options: 2024, 2025, 2026, 2027
  - `target_type_select` · select · options: Select Target Type, Personal Training, General Training, Both, New Personal Training, New General Training, Renew Personal Training, Renew General Training
  - `commission_type_select` · select · options: Select Commission Type, Flat Value, Percentage
  - Target 1 · `target_1` · text · required
  - eg.123 · `commission_target_1` · text
  - Target 2 · `target_2` · text
  - eg.123 · `commission_target_2` · text
  - Target 3 · `target_3` · text
  - eg.123 · `commission_target_3` · text
  - Target 4 · `target_4` · text
  - eg.123 · `commission_target_4` · text
  - Target 5 · `target_5` · text
  - eg.123 · `commission_target_5` · text

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS STAFF/TRAINER ?** — buttons: No

## Attendance Reports

### Attendance Reports › Staff & Trainer attendance

`/gym-members-report-data/`

Headings: Report Insights · Report :
Actions: Reset Password · Log Out · import · clear filter · Back · Next

Form 2:
- **Report Insights**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)

Form 3:
- **Report :**
  - `user_group_id` · select · options: {4 people/records}
  - `staff_entity` · select · options: {14 people/records}
  - `trainer_entity` · select · options: {17 people/records}
  - `multi_gym_entity` · select · options: All
  - `transaction_entity` · select · options: All, Paid, Pending, Failed, Cancelled
  - `refered_entity` · select · options: All, [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person], [person] … (+5)
- [button] import
- [button] Back
- [button] Next

### Attendance Reports › Client Attendance

`/merchant/fitness-center/customers/traffic/`

Headings: TrafficCustomer Listing · Filters Applied Fetched Members Checkins(10)
Columns: Customer Picture & Customer Name | Fitness center | Checkin time | Checkout time | Checkin Count | Subscription Status | Membership Plan Name | Action
Filter labels: From
Actions: Reset Password · Log Out · Search · Submit · Export to CSV ·  Traffic Filter · Actions · View · Add Follow up

Form 2:
- [button] x
- **Filters**
- **Traffic**
- **Traffic by Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Total Others · `gender_filter` · checkbox
- **Current Traffic**
  - Present Traffic · `current_traffic` · checkbox
- **Checkin By day**
  - Morning Checkins · `morn_chk` · checkbox
  - Afternoon Checkins · `aftrnoon_chk` · checkbox
  - Evening Checkins · `evn_chk` · checkbox
- **Checkins by Age**
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
- **Checkins by Level**
  - Beginner · `member_level` · checkbox
  - Intermediate · `member_level` · checkbox
  - Advanced · `member_level` · checkbox
- **Bounced**
  - Customers not visited gym from 2 weeks · `not_visit_2_weeks` · checkbox
- **Irregular Member**
  - Active Customers not visited By Date Filter · `irregular_by_date` · checkbox
  - Active Customers not visited gym from 3 days · `irregular_member` · checkbox
- **Regular Member**
  - Customers visited gym atleast once in past 2 weeks · `visit_2_weeks` · checkbox
- **Balance Due**
  - Members With Balance Payment · `balance_payment` · checkbox
- **Subscription Status**
  - Active Members · `subscription_status` · checkbox
  - Inactive Members · `subscription_status` · checkbox
- **Present CheckIn with**
  - Expire Subscription · `present_checkin` · checkbox
  - About Expire Members · `present_checkin` · checkbox
  - Balance Due · `present_checkin` · checkbox
- **Select Category**
  - `plan_category` · select · options: Select Category, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
- **Select Membership**
  - `membership_plan` · select · options: {24 people/records}
- [button] Close
- [button] Apply
- **TrafficCustomer Listing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
- [button] Submit
  - To · `dropdown` · select · options: Last 3 Days (05 October 2026 - 08 October 2026), Last 7 Days (01 October 2026 - 08 October 2026), Last 14 Days (24 September 2026 - 08 October 2026), Custom (08 October 2026 - 08 October 2026)
  - `end_picker_date` · text
  - `start_picker_date` · text
- [button] Export to CSV
- [button]  Traffic Filter
- **Filters Applied Fetched Members Checkins(#)**
  - `check-all-box` · checkbox
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions
- [button] Actions

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Total Others · `gender_filter` · checkbox
  - Present Traffic · `current_traffic` · checkbox
  - Morning Checkins · `morn_chk` · checkbox
  - Afternoon Checkins · `aftrnoon_chk` · checkbox
  - Evening Checkins · `evn_chk` · checkbox
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
  - Beginner · `member_level` · checkbox
  - Intermediate · `member_level` · checkbox
  - Advanced · `member_level` · checkbox
  - Customers not visited gym from 2 weeks · `not_visit_2_weeks` · checkbox
  - Active Customers not visited By Date Filter · `irregular_by_date` · checkbox
  - Active Customers not visited gym from 3 days · `irregular_member` · checkbox
  - Customers visited gym atleast once in past 2 weeks · `visit_2_weeks` · checkbox
  - Members With Balance Payment · `balance_payment` · checkbox
  - Active Members · `subscription_status` · checkbox
  - Inactive Members · `subscription_status` · checkbox
  - Expire Subscription · `present_checkin` · checkbox
  - About Expire Members · `present_checkin` · checkbox
  - Balance Due · `present_checkin` · checkbox
  - `plan_category` · select · options: Select Category, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
  - `membership_plan` · select · options: {24 people/records}

Opens: `/fitness-center/customer/folloup-history/Customer-{id}/0/` · `/fitness-center/customer/Customer-{id}/0/` · `/fitness-center/customer/basic-information/Customer-{id}/`

### Attendance Reports › Check-ins Leaderboard

`/merchant/fitness-center/customers/checkins-leaderboard/`

Headings: Client Check-ins Leaderboard · Top 5 Check-ins (October 01, 2026 - October 08, 2026)
Columns: Customer Name | Total Check-ins | Latest (Check-in - Check-out) | Subscription Status
Filter labels: End Date · Start Date · Customer Gender
Actions: Reset Password · Log Out · Search · Submit

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **Client Check-ins Leaderboard**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Name or Mobile Number or Email · `search_list` · text
- [button] Search
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `customer_gender` · select · options: {4 people/records}
- **Top 5 Check-ins (October 01, 2026 - October 08, 2026)**

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

Opens: `/fitness-center/customer/Customer-{id}/`

## App Settings

### App Settings › On/Off Permission

`/fitness-center/app/permission/`

Headings: App Permission Basic Information
Columns: Operations | Permissions | Enable Online Training Permission
Actions: Reset Password · Log Out · Save

Form 2:
- **App Permission Basic Information**
- **1. Acceptance of Terms**
- **2. Use of the Application**
- **3. User Accounts**
- **4. Intellectual Property**
- **5. Privacy**
- **6. Limitation of Liability**
- **7. Changes to Terms**
- **8. Contact Us**
- [button] Save

### App Settings › Services List

`/fitness-center-categories/`

Headings: Service Listing
Columns: # | Name / Custom Name | Navigate To | Show in App | Banner | Action
Actions: Reset Password · Log Out · Search

Form 2:
- **Service Listing**
  - Navigate To · `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by name or custom name… · `search_list` · text
- [button] Search

Pop-up: **Edit — Weight Training** — buttons: Cancel, Save Changes
  - Navigate To · `description` · select · options: — Select destination —, Class Listing, Membership Plans
  - Navigate To · `show_in_app` · checkbox
  - Navigate To · `banner` · file

Pop-up: **Remove Category** — buttons: Cancel, Yes, Remove

Pop-up: **Edit — Cardio** — buttons: Cancel, Save Changes
  - Navigate To · `description` · select · options: — Select destination —, Class Listing, Membership Plans
  - Navigate To · `show_in_app` · checkbox
  - Navigate To · `banner` · file

Pop-up: **Edit — Cross-fit** — buttons: Cancel, Save Changes
  - Navigate To · `description` · select · options: — Select destination —, Class Listing, Membership Plans
  - Navigate To · `show_in_app` · checkbox
  - Navigate To · `banner` · file

Pop-up: **Edit — Personal Training / Nutrition** — buttons: Cancel, Save Changes
  - Navigate To · `description` · select · options: — Select destination —, Class Listing, Membership Plans
  - Navigate To · `show_in_app` · checkbox
  - Navigate To · `banner` · file

Pop-up: **Edit — Calisthenics** — buttons: Cancel, Save Changes
  - Navigate To · `description` · select · options: — Select destination —, Class Listing, Membership Plans
  - Navigate To · `show_in_app` · checkbox
  - Navigate To · `banner` · file

Pop-up: **Edit — HIIT** — buttons: Cancel, Save Changes
  - Navigate To · `description` · select · options: — Select destination —, Class Listing, Membership Plans
  - Navigate To · `show_in_app` · checkbox
  - Navigate To · `banner` · file

Pop-up: **Edit — Strength Training** — buttons: Cancel, Save Changes
  - Navigate To · `description` · select · options: — Select destination —, Class Listing, Membership Plans
  - Navigate To · `show_in_app` · checkbox
  - Navigate To · `banner` · file

Pop-up: **Edit — Group Activity** — buttons: Cancel, Save Changes
  - Navigate To · `description` · select · options: — Select destination —, Class Listing, Membership Plans
  - Navigate To · `show_in_app` · checkbox
  - Navigate To · `banner` · file

Pop-up: **Edit — Nutrition** — buttons: Cancel, Save Changes
  - Navigate To · `description` · select · options: — Select destination —, Class Listing, Membership Plans
  - Navigate To · `show_in_app` · checkbox
  - Navigate To · `banner` · file

Pop-up: **Edit — Steam** — buttons: Cancel, Save Changes
  - Navigate To · `description` · select · options: — Select destination —, Class Listing, Membership Plans
  - Navigate To · `show_in_app` · checkbox
  - Navigate To · `banner` · file

### App Settings › Gallery Image

#### App Settings › Gallery Image › Create Gallery

`/fitness-center/gallery/basic-information/`

Headings: Gallery Basic Information · Image
Filter labels: Upload Image * · Image Type* · Gallery Login Screen
Actions: Reset Password · Log Out · Upload · Save · Save & add another

Form 2:
- **Image**
  - `img_1` · file
- [button] Upload
  - Gallery Image · `type_of` · checkbox
  - Offer Image · `type_of` · checkbox
  - `login_type_list` · select · options: Select Login Type, NUMBER LOGIN, SLIDER LOGIN
- [button] Save
- [button] Save & add another

#### App Settings › Gallery Image › Gallery List

`/merchant/gallery/gallery-list/`

Headings: Gallery Listing
Columns: Image | Fitness Center Name | Action
Actions: Reset Password · Log Out · Search · Delete · Add Gallery · Edit · Back · Next

Form 2:
  - Search · `search_list` · text
- [button] Search
- [button] Delete
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS GALLERY ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS GALLERY ?** — buttons: No

Opens: `/fitness-center/gallery/basic-information/{id}/`

### App Settings › Action Item

#### App Settings › Action Item › Create Action

`/fitness-center/action/action-item/`

Headings: Action Item Basic Information
Filter labels: Action Item Name* · Add Icon * · Add Colour * · Active · Add Link Name* · Show the Action item to* · Add Link Id · Add Action Id · Ordering
Actions: Reset Password · Log Out · Show Optional Fields · Save · Save & add another

Form 2:
  - `fc_text` · text · required
  - `fc_icon` · select · required · options: Select Icon, Free Workout, Claim Free Course, Browse Plans, Free Class, Buy Courses, Recipes, Track Your Diet, Message, WhatsApp, Personal Trainer, Medicine, Laboratory, Facebook, Instagram, Search, Contact Us, Website, Body Transformation, Products Icon, PT Trial, Book Classes, Books, Calendar, Credit Card … (+14)
  - `fc_color_code` · color · required
  - Is active · `fc_is_active` · checkbox
  - `fc_link` · select · required · options: Select Link Name, About Us, Add diary/notes, Add measurement, Add post in community, Appointment Screen, Articles Screen, Checkins or Attendance Calendar, Challenges List, Coach Profile, Trainer Profile, Dietician/Nutritonist profile, Community homepage, Classes Listing, Coaches or Trainers or Dieiticians Listing, Coach Tab or PT Details Tab or Sessions Tab, Contact us, Custom Client Form with History, Custom Screen, Diary list, Diet Analysis, Exercise Analysis, External Web link (redirects user to external web browser or app), Feedback, Fitness form, health form, PARQ form, Fitness Center Notices, Fitness Center Rules … (+28)
  - Both (Paid/Free) · `sub_type` · radio
  - Paid Users · `sub_type` · radio
  - Free Users · `sub_type` · radio
  - Active PT or Personalised Plan Clients · `sub_type` · radio
  - Clients with Active general plan but no personalised plans · `sub_type` · radio
  - Clients with All Expired plans · `sub_type` · radio
- [button] Show Optional Fields
  - `fc_link_Id` · text
  - `fc_aid` · text
  - `fc_ordering` · number · default 0
- [button] Save
- [button] Save & add another

#### App Settings › Action Item › Action List

`/merchant/action-item-list/`

Headings: Action Items Listing
Columns: Icon | Item Name | No. of Order | Colour | Status | Date | Action
Actions: Reset Password · Log Out · Search · Delete · Deactivate · Activate · Add Action Item · Edit · Back · Next

Form 2:
  - Search · `search_list` · text
- [button] Search
- [button] Delete
- [button] Deactivate
- [button] Activate
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS ACTION ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE THIS ACTION ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE THIS ACTION ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS ACTION ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE THIS ACTION ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE THIS ACTION ?** — buttons: No

Opens: `/fitness-center/action/action-item/{id}/`

### App Settings › Quick Action Item

#### App Settings › Quick Action Item › Create Quick Action Item

`/fitness-center/action/quick-action-item/`

Headings: Quick Action Item Basic Information
Filter labels: Quick Action Item Name* · Add Icon * · Add Colour * · Active · Add Link Name* · Show the Quick Action item to* · Add Link Id · Add Quick Action Item Id · Ordering
Actions: Reset Password · Log Out · Show Optional Fields · Save · Save & add another

Form 2:
  - `fc_text` · text · required
  - `fc_icon` · select · required · options: Select Icon, Free Workout, Claim Free Course, Browse Plans, Free Class, Buy Courses, Recipes, Track Your Diet, Message, WhatsApp, Personal Trainer, Medicine, Laboratory, Facebook, Instagram, Search, Contact Us, Website, Body Transformation, Products Icon, My Profile, My Diet Plan, My Coupons
  - `fc_color_code` · color · required
  - Is active · `fc_is_active` · checkbox
  - `fc_link` · select · required · options: Select Link Name, About Us, Add diary/notes, Add measurement, Add post in community, Appointment Screen, Articles Screen, Checkins or Attendance Calendar, Challenges List, Coach Profile, Trainer Profile, Dietician/Nutritonist profile, Community homepage, Classes Listing, Coaches or Trainers or Dieiticians Listing, Coach Tab or PT Details Tab or Sessions Tab, Contact us, Custom Client Form with History, Custom Screen, Diary list, Diet Analysis, Exercise Analysis, External Web link (redirects user to external web browser or app), Feedback, Fitness form, health form, PARQ form, Fitness Center Notices, Fitness Center Rules … (+27)
  - Both (Paid/Free) · `sub_type` · radio
  - Paid Users · `sub_type` · radio
  - Free Users · `sub_type` · radio
  - Active PT or Personalised Plan Clients · `sub_type` · radio
  - Clients with Active general plan but no personalised plans · `sub_type` · radio
  - Clients with All Expired plans · `sub_type` · radio
- [button] Show Optional Fields
  - `fc_link_Id` · text
  - `fc_aid` · text
  - `fc_ordering` · number · default 0
- [button] Save
- [button] Save & add another

#### App Settings › Quick Action Item › Quick Action Item List

`/merchant/quick-action-item-list/`

Headings: Quick Action Items Listing
Columns: Item Name | No. of Order | Colour | Status | Date | Action
Actions: Reset Password · Log Out · Search · Delete · Deactivate · Activate · Add Quick Action Item · Edit · Back · Next

Form 2:
  - Search · `search_list` · text
- [button] Search
- [button] Delete
- [button] Deactivate
- [button] Activate
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS ACTION ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE THIS ACTION ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE THIS ACTION ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS ACTION ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE THIS ACTION ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE THIS ACTION ?** — buttons: No

Opens: `/fitness-center/action/quick-action-item/{id}/`

### App Settings › Banner Image

#### App Settings › Banner Image › Create Banner

`/fitness-center/banner/basic-information/`

Headings: Banner Basic Information · Image
Filter labels: Banner Name * · Upload Banner image * · Website URL · Active · Link · Category · Hold down "Control", or "Command" on a Mac, to select more than one. · Show the banner to* · Meta Link · Meta Link Id · Ordering
Actions: Reset Password · Log Out · Show Optional Fields · Save · Save & add another

Form 2:
  - `fn_blog_title` · text · required
- **Image**
  - `banner_img` · file
  - `fn_web_url` · text
  - Is active · `fn_is_active` · checkbox
  - Is external link · `fn_is_external_link` · checkbox
  - `fn_tags` · select · options: Select Link Name, About Us, Add diary/notes, Add measurement, Add post in community, Appointment Screen, Articles Screen, Checkins or Attendance Calendar, Challenges List, Coach Profile, Trainer Profile, Dietician/Nutritonist profile, Community homepage, Classes Listing, Coaches or Trainers or Dieiticians Listing, Coach Tab or PT Details Tab or Sessions Tab, Contact us, Custom Client Fitness Form, Custom Screen, Diary list, Diet Analysis, Exercise Analysis, External Web link (redirects user to external web browser or app), Feedback, Fitness form, health form, PARQ form, Fitness Center Notices, Fitness Center Rules … (+27)
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `category_list` · multiselect · options: Select Category, Sponsored, Top Sponsored, Custom Screen, Custom Screen 1, Custom Screen 2, Custom Screen 3, Custom Screen 4, Custom Screen 5, Custom Screen 6, Custom Screen 7, Custom Screen 8, Custom Screen 9, Custom Screen 10
  - Both (Paid/Free) · `sub_type` · radio
  - Paid Users · `sub_type` · radio
  - Free Users · `sub_type` · radio
  - Active PT or Personalised Plan Clients · `sub_type` · radio
  - Clients with Active general plan but no personalised plans · `sub_type` · radio
  - Clients with All Expired plans · `sub_type` · radio
- [button] Show Optional Fields
  - `fn_meta_description` · text
  - `fn_meta_keywords` · text
  - `fn_ordering` · number · default 0
- [button] Save
- [button] Save & add another

#### App Settings › Banner Image › Banner List

`/merchant/banner/banner-list/`

Headings: Banners Listing
Columns: Banner Name | No. of Order | Status | Category | Date | Action
Actions: Reset Password · Log Out · Search · Delete · Deactivate · Activate · Add Banner · Edit · Back · Next

Form 2:
  - Search · `search_list` · text
- [button] Search
  - `selected_category` · select · options: Select Category, Rest Day, Post Workout Diet, Pre-Workout Diet, Expert Articles, Sponsored, Top Sponsored, Power Yoga, Cross-fit, Cardio, Custom Screen, Custom Screen 1, Custom Screen 2, Custom Screen 3, Custom Screen 4, Custom Screen 5, Custom Screen 6, Custom Screen 7, Custom Screen 8, Custom Screen 9, Custom Screen 10
- [button] Delete
- [button] Deactivate
- [button] Activate
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS BANNER ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE THIS BANNER ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE THIS BANNER ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS BANNER ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE THIS BANNER ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE THIS BANNER ?** — buttons: No

Opens: `/fitness-center/banner/basic-information/{id}/`

### App Settings › Add Social Links & QR

`/fitness-center/app/social-link/`

Headings: Social Media And Video Link Basic Information
Filter labels: Facebook Link · Instagram Link · Twitter Link · YouTube Link · Video Link · LinkedIn Link · Whatsapp Number
Actions: Reset Password · Log Out · Save

Form 2:
  - `facebook_link` · text
  - `instagram_link` · text
  - `Twiiter_link` · text
  - `YouTube_link` · text
  - `Video_link` · text
  - `linkedin_link` · text
  - `Whatsapp_link` · text
- [button] Save

### App Settings › Measurement Settings

`/fitness-centers/measurement_settings/`

Headings: Measurements Settings Form
Columns: Operations
Actions: Reset Password · Log Out · Save

Form 2:
- **Measurements Settings Form**
- [button] Save

### App Settings › Workouts & Diet

#### App Settings › Workouts & Diet › Workout Plans

#### App Settings › Workouts & Diet › Workout Plans › My Workout Plans

`/fitness-center/workout-plan/workout-plan-list/`

Headings: Workout plans Listing
Columns: Plan Name | Trainer Name | Days of Weeks | Goal | Level | Status Public Plan | Status | Action
Actions: Reset Password · Log Out · Search · Delete · Deactivate · Activate

Form 2:
- **Workout plans Listing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
- [button] Delete
- [button] Deactivate
- [button] Activate
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS WORKOUT PLAN ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE THIS WORKOUT PLAN ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE THIS WORKOUT PLAN ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS WORKOUT PLAN ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE THIS WORKOUT PLAN ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE THIS WORKOUT PLAN ?** — buttons: No

Opens: `/fitness-center/workout-plan/change-request/{id}/make_public/`

#### App Settings › Workouts & Diet › Diet Plans

#### App Settings › Workouts & Diet › Diet Plans › My Diet Plans

`/fitness-center/workout-plan/diet-plan-list/`

Headings: Diet plans Listing
Columns: Plan Name | Trainer Name | Days of Weeks | Goal | Level | Status Public Plan | Status | Download
Actions: Reset Password · Log Out · Search · Delete · Deactivate · Activate

Form 2:
- **Diet plans Listing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
- [button] Delete
- [button] Deactivate
- [button] Activate
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS WORKOUT PLAN ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE THIS WORKOUT PLAN ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE THIS WORKOUT PLAN ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS WORKOUT PLAN ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE THIS WORKOUT PLAN ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE THIS WORKOUT PLAN ?** — buttons: No

Opens: `/fitness-center/workout-plan/change-diet-request/{id}/make_public/`

#### App Settings › Workouts & Diet › Diet Plans › Verify Diet Food Listing

`/diet/master-diet-item/`

Headings: Diet Food Listing
Columns: Item Name | Quantity | Quantity Units | Proteins In gm | Fats In gm | Carbs In gm | Fibers In gm | Calorie | Is Veg | Is Verified
Actions: Reset Password · Log Out · Search · Delete · Update Selected · Back · Next

Form 2:
- [button] x
- **Filters**
- **Traffic**
- **Traffic by Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Total Others · `gender_filter` · checkbox
- **Current Traffic**
  - Present Traffic · `current_traffic` · checkbox
- **Checkin By day**
  - Morning Checkins · `morn_chk` · checkbox
  - Afternoon Checkins · `aftrnoon_chk` · checkbox
  - Evening Checkins · `evn_chk` · checkbox
- **Checkins by Age**
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
- **Checkins by Level**
  - Beginner · `member_level` · checkbox
  - Intermediate · `member_level` · checkbox
  - Advanced · `member_level` · checkbox
- **Bounced**
  - Customers not visited gym from 2 weeks · `not_visit_2_weeks` · checkbox
- **Irregular Member**
  - Active Customers not visited By Date Filter · `irregular_by_date` · checkbox
  - Active Customers not visited gym from 3 days · `irregular_member` · checkbox
- **Regular Member**
  - Customers visited gym atleast once in past 2 weeks · `visit_2_weeks` · checkbox
- **Balance Due**
  - Members With Balance Payment · `balance_payment` · checkbox
- **Subscription Status**
  - Active Members · `subscription_status` · checkbox
  - Inactive Members · `subscription_status` · checkbox
- **Present CheckIn with**
  - Expire Subscription · `present_checkin` · checkbox
  - About Expire Members · `present_checkin` · checkbox
  - Balance Due · `present_checkin` · checkbox
- **Select Category**
  - `plan_category` · select · options: Select Category
- **Select Membership**
  - `membership_plan` · select · options: Select Membership
- [button] Close
- [button] Apply
- **Diet Food Listing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
- [button] Delete
- [button] Update Selected
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Total Others · `gender_filter` · checkbox
  - Present Traffic · `current_traffic` · checkbox
  - Morning Checkins · `morn_chk` · checkbox
  - Afternoon Checkins · `aftrnoon_chk` · checkbox
  - Evening Checkins · `evn_chk` · checkbox
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
  - Beginner · `member_level` · checkbox
  - Intermediate · `member_level` · checkbox
  - Advanced · `member_level` · checkbox
  - Customers not visited gym from 2 weeks · `not_visit_2_weeks` · checkbox
  - Active Customers not visited By Date Filter · `irregular_by_date` · checkbox
  - Active Customers not visited gym from 3 days · `irregular_member` · checkbox
  - Customers visited gym atleast once in past 2 weeks · `visit_2_weeks` · checkbox
  - Members With Balance Payment · `balance_payment` · checkbox
  - Active Members · `subscription_status` · checkbox
  - Inactive Members · `subscription_status` · checkbox
  - Expire Subscription · `present_checkin` · checkbox
  - About Expire Members · `present_checkin` · checkbox
  - Balance Due · `present_checkin` · checkbox
  - `plan_category` · select · options: Select Category
  - `membership_plan` · select · options: Select Membership

#### App Settings › Workouts & Diet › Diet Plans › Verify Diet Recipe Listing

`/fitness-center/workout/client-recipe-list/`

Headings: Verify Client Diet Recipe
Columns: Item Name | Quantity | Quantity Units | Proteins In gm | Fats In gm | Carbs In gm | Fibers In gm | Calorie | Notes | PDFLink | PrepTime | Image | Is Veg | Is Verified
Actions: Reset Password · Log Out · Search · Delete · Update Selected · Disapprove · Approve · View · Back · Next

Form 2:
- [button] x
- **Filters**
- **Traffic**
- **Traffic by Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Total Others · `gender_filter` · checkbox
- **Current Traffic**
  - Present Traffic · `current_traffic` · checkbox
- **Checkin By day**
  - Morning Checkins · `morn_chk` · checkbox
  - Afternoon Checkins · `aftrnoon_chk` · checkbox
  - Evening Checkins · `evn_chk` · checkbox
- **Checkins by Age**
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
- **Checkins by Level**
  - Beginner · `member_level` · checkbox
  - Intermediate · `member_level` · checkbox
  - Advanced · `member_level` · checkbox
- **Bounced**
  - Customers not visited gym from 2 weeks · `not_visit_2_weeks` · checkbox
- **Irregular Member**
  - Active Customers not visited By Date Filter · `irregular_by_date` · checkbox
  - Active Customers not visited gym from 3 days · `irregular_member` · checkbox
- **Regular Member**
  - Customers visited gym atleast once in past 2 weeks · `visit_2_weeks` · checkbox
- **Balance Due**
  - Members With Balance Payment · `balance_payment` · checkbox
- **Subscription Status**
  - Active Members · `subscription_status` · checkbox
  - Inactive Members · `subscription_status` · checkbox
- **Present CheckIn with**
  - Expire Subscription · `present_checkin` · checkbox
  - About Expire Members · `present_checkin` · checkbox
  - Balance Due · `present_checkin` · checkbox
- **Select Category**
  - `plan_category` · select · options: Select Category
- **Select Membership**
  - `membership_plan` · select · options: Select Membership
- [button] Close
- [button] Apply
- **Verify Client Diet Recipe**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
  - `post_list_type` · select · options: Show-All Recipe, Verified Recipe, Non Verified Recipe
- [button] Delete
- [button] Update Selected
- [button] Disapprove
- [button] Approve
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Total Others · `gender_filter` · checkbox
  - Present Traffic · `current_traffic` · checkbox
  - Morning Checkins · `morn_chk` · checkbox
  - Afternoon Checkins · `aftrnoon_chk` · checkbox
  - Evening Checkins · `evn_chk` · checkbox
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
  - Beginner · `member_level` · checkbox
  - Intermediate · `member_level` · checkbox
  - Advanced · `member_level` · checkbox
  - Customers not visited gym from 2 weeks · `not_visit_2_weeks` · checkbox
  - Active Customers not visited By Date Filter · `irregular_by_date` · checkbox
  - Active Customers not visited gym from 3 days · `irregular_member` · checkbox
  - Customers visited gym atleast once in past 2 weeks · `visit_2_weeks` · checkbox
  - Members With Balance Payment · `balance_payment` · checkbox
  - Active Members · `subscription_status` · checkbox
  - Inactive Members · `subscription_status` · checkbox
  - Expire Subscription · `present_checkin` · checkbox
  - About Expire Members · `present_checkin` · checkbox
  - Balance Due · `present_checkin` · checkbox
  - `plan_category` · select · options: Select Category
  - `membership_plan` · select · options: Select Membership

#### App Settings › Workouts & Diet › Diet Plans › Recipe Listing

`/fitness-center/workout/recipe-list/`

Headings: Recipe Listing
Columns: Item Name | Calories | Prep Time | Status
Actions: Reset Password · Log Out · Search · Delete · Deactivate · Activate · Import Recipe

Form 2:
- **Recipe Listing**
  - Search · `search_list` · text
- [button] Search
- [button] Delete
- [button] Deactivate
- [button] Activate
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS RECIPE ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE THIS RECIPE ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE THIS RECIPE ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS RECIPE ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE THIS RECIPE ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE THIS RECIPE ?** — buttons: No

#### App Settings › Workouts & Diet › Exercises

#### App Settings › Workouts & Diet › Exercises › Exercise List

`/fitness-center/exercise/exercise-list/`

Headings: Exercise Listing · General Exercise List
Columns: Exercise Name | Fitness center | Exercise Type | Body Part | Action
Columns: # | Id | Exercise Image | Exercise Name | Exercise Type | Body Part. | Action
Actions: Reset Password · Log Out · Search · Exclude in App · Include in App

Form 2:
- **Exercise Listing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
- [button] Exclude in App
- [button] Include in App
  - `body_part_slt` · select · options: {1005 options}
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE SELECTED EXERCISE ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox
- **General Exercise List**

Pop-up: **ARE YOU SURE YOU WANT TO DELETE SELECTED EXERCISE ?** — buttons: No

Opens: `/fitness-center/exercise/preview/{id}/`

### App Settings › Community

`/community/pending-home-page/`

Headings: Community Pending Posts
Tabs: Pending Post · Active Post · Decline post · All Post
Actions: Reset Password · Log Out · Upload Post · Search · Delete · Decline · Accept

Form 2:
- **Community Pending Posts**
  - Search by user name · `search_list` · text
- [button] Search
- [button] Delete
- [button] Decline
- [button] Accept
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS POST ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO DECLINE THIS POST ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE THIS POST ?**
- [button] Yes
- [button] No

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS POST ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DECLINE THIS POST ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE THIS POST ?** — buttons: No

### App Settings › Challenges

#### App Settings › Challenges › Create Challenge

`/app-challenge/basic-information/`

Headings: ChallengeBasic Information · Challenge terms & conditions
Filter labels: Challenge Name * · Description · Video URL · Image · Challenge Start Date* · Challenge End Date* · Terms & Conditions * · Do you want to add task ? * · Yes · Client Challenge Level
Actions: Reset Password · Log Out · Cancel · Save & Next · Save

Form 2:
  - eg. Go fit fitness challenge · `challenge_name` · text · required
  - Write nice & sweet challenge description. · `challenge_description` · textarea
  - `video_link` · text
  - `challenge_logo` · file
  - Challenge Start Date* · `challenge_start_date` · text · required
  - Challenge End Date* · `challenge_end_date` · text · required
- **Challenge terms & conditions**
  - challenge related terms & conditions · `terms_and_conditions` · textarea · required
  - `add_task` · radio
  - `add_task` · radio
  - Client Challenge Level · `client_level` · select · options: {4 people/records}
- [button] Cancel
- [button] Save & Next
- [button] Save

#### App Settings › Challenges › Challenge List

`/app-challenge/challenge-list/`

Headings: Challenges Listing
Columns: Challenge Name | Start Date | End Date | Action
Actions: Reset Password · Log Out · Search · Delete · Deactivate · Activate · Create Challenge · Edit · View · Copy

Form 2:
- **Challenges Listing**
  - Search · `search_list` · text
- [button] Search
- [button] Delete
- [button] Deactivate
- [button] Activate
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS Challenge ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE THIS Challenge ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE THIS Challenge ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox
  - `check-all-box` · checkbox

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS Challenge ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE THIS Challenge ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE THIS Challenge ?** — buttons: No

Opens: `/app-challenge/Challenge-{id}/` · `/app-challenge/view/Challenge-{id}/`

#### App Settings › Challenges › Create Teams

`/app-challenge/group/group-basic-information/`

Headings: TeamBasic Information
Filter labels: Team Name * · Select Challenge*
Actions: Reset Password · Log Out · Cancel · Save & Next · Save

Form 2:
  - eg. Team Beta · `group_name` · text · required
  - `challenge_select` · select · options: April Anniversary Challenge, Demo
- [button] Cancel
- [button] Save & Next
- [button] Save

#### App Settings › Challenges › Team List

`/app-challenge/group/group-list/`

Headings: Teams Listing
Columns: Team Name | Challenge Name | Created by | Action
Actions: Reset Password · Log Out · Delete · Deactivate · Activate · Create Team

Form 2:
- **Teams Listing**
- [button] Delete
- [button] Deactivate
- [button] Activate
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS Group ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE THIS Group ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE THIS Group ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox
  - `check-all-box` · checkbox

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS Group ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE THIS Group ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE THIS Group ?** — buttons: No

## Tutorial & Help Videos

### Tutorial & Help Videos › Tutorial Videos

`/all_tutorial_videos/?data=Customer Application` (not captured)

### Tutorial & Help Videos › Admin Dashboard FAQ's

`/admin_dashboard/?data=Admin Dashboard` (not captured)

## Appointments

`/book-appoinment/`

Headings: Schedule Appointments
Actions: Reset Password · Log Out · Submit

Form 2:
- **Schedule Appointments**
- [button] Submit
  - `post_appoinment_status` · select · options: All Status, Open, No Action, Attended, No Show, Confirmed, Wait List, Cancelled, Other
  - `purpose_select` · select · options: All purpose, Meeting, Class, Diet Consultation, PT Session, Live Video Session, Telephonic appointment, Therapy, Wellness Profile & Counselling, Fitness Test, Fitness Counselling, Steam Booking, BMI Check, Foot Reflexology, Tour(GYM Floor Tour)
  - `staff_assign_select` · select · options: {23 people/records}
- [button] ×
- **Schedule Appointment**
  - Status · `appoinment_status` · select · options: Open, No Action, Attended, No Show, Cancelled
  - `appoinment_purpose_select` · select · options: Meeting, Class, Diet Consultation, PT Session, Live Video Session, Telephonic appointment, Therapy, Wellness Profile & Counselling, Fitness Test, Fitness Counselling, Steam Booking, BMI Check, Foot Reflexology, Tour(GYM Floor Tour)
  - `comments` · textarea
  - `appoinment_date` · text · required
  - Start Time * · `appoinment_start_time` · text · required
  - End Time * · `appoinment_end_time` · text · required
  - Customer Code * · `cust_code` · text
  - `handled_by_select` · select · options: {22 people/records}
  - Room No. · `room_no` · text
  - Yes · `noti_to_client` · radio
  - No · `noti_to_client` · radio
- [button] Close
- [button] Save changes
- [button] ×
- **Edit Scheduled Appointment**
  - `update_appoinment_status` · select · options: Open, No Action, Attended, No Show, Cancelled, Rescheduled
  - `update_appoinment_purpose_select` · select · options: Meeting, Class, Diet Consultation, PT Session, Live Video Session, Telephonic appointment, Therapy, Wellness Profile & Counselling, Fitness Test, Fitness Counselling, Steam Booking, BMI Check, Foot Reflexology, Tour(GYM Floor Tour)
  - `update_comments` · textarea
  - `update_appoinment_date` · text · required
  - Start Time* · `update_appoinment_start_time` · text · required
  - End Time* · `update_appoinment_end_time` · text · required
  - `update_cust_code` · text
  - `cust_name` · textarea
  - `multi_cust_name` · select · options: 
  - `update_handled_by_select` · select · options: {22 people/records}
  - `update_room_no` · text
- [button] Close
- [button] Save changes
- [button] Delete

Pop-up: **Schedule Appointment** — buttons: Lookup Member code, Lookup Enquiry code, Save changes
  - Status · `appoinment_status` · select · options: Open, No Action, Attended, No Show, Cancelled
  - `appoinment_purpose_select` · select · options: Meeting, Class, Diet Consultation, PT Session, Live Video Session, Telephonic appointment, Therapy, Wellness Profile & Counselling, Fitness Test, Fitness Counselling, Steam Booking, BMI Check, Foot Reflexology, Tour(GYM Floor Tour)
  - `comments` · textarea
  - `appoinment_date` · text · required
  - Start Time * · `appoinment_start_time` · text · required
  - End Time * · `appoinment_end_time` · text · required
  - Customer Code * · `cust_code` · text
  - `handled_by_select` · select · options: {22 people/records}
  - Room No. · `room_no` · text
  - Yes · `noti_to_client` · radio
  - No · `noti_to_client` · radio

Pop-up: **Edit Scheduled Appointment** — buttons: Lookup Member code, Lookup Enquiry code, Save changes, Delete
  - `update_appoinment_status` · select · options: Open, No Action, Attended, No Show, Cancelled, Rescheduled
  - `update_appoinment_purpose_select` · select · options: Meeting, Class, Diet Consultation, PT Session, Live Video Session, Telephonic appointment, Therapy, Wellness Profile & Counselling, Fitness Test, Fitness Counselling, Steam Booking, BMI Check, Foot Reflexology, Tour(GYM Floor Tour)
  - `update_comments` · textarea
  - `update_appoinment_date` · text · required
  - Start Time* · `update_appoinment_start_time` · text · required
  - End Time* · `update_appoinment_end_time` · text · required
  - `update_cust_code` · text
  - `cust_name` · textarea
  - `multi_cust_name` · select · options: 
  - `update_handled_by_select` · select · options: {22 people/records}
  - `update_room_no` · text

## More Options

### More Options › Wallet

#### More Options › Wallet › Categories

#### More Options › Wallet › Categories › Create Category

`/fitness-center/wallet-category/basic-information/`

Headings: Wallet CategoryBasic Information
Filter labels: Category Name * · Category Description · Is Active
Actions: Reset Password · Log Out · Back · Save & Close · Save

Form 2:
  - Category Name * · `category_name` · text · required
  - e.g. Games Category gives you access to gym game area. · `description` · textarea
  - Yes · `is_active` · radio · required
  - No · `is_active` · radio · required
- [button] Back
- [button] Save & Close
- [button] Save

#### More Options › Wallet › Categories › Category List

`/fitness-center/category/category-list/`

Headings: Wallet Category Listing
Columns: Category Name | Category Code | Status | Created by | Action
Actions: Reset Password · Log Out · Search

Form 2:
- **Wallet Category Listing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search By Category Name or Code · `search_list` · text
- [button] Search
  - `check-all-box` · checkbox

#### More Options › Wallet › Activity Plans

#### More Options › Wallet › Activity Plans › Create Activity

`/fitness-center/activity/basic-information/`

Headings: Activity PlansBasic Informations · Activity Category
Filter labels: Activity Name * · Activity Price * · Activity Description · Is One time · Activity Duration (hourly basis) · Select Category* · Is Active
Actions: Reset Password · Log Out · Back · Save & Close · Save

Form 2:
  - Activity Name * · `activity_name` · text · required
  - e.g. 10000  · `activity_price` · text · required
  - e.g. Games Activity gives you access to gym game are. · `description` · textarea
  - Yes · `is_one_time` · radio
  - No · `is_one_time` · radio
  - `activity_period_units` · text
- **Activity Category**
  - `activity_category` · select · required · options: Select Activity Category, Refer & Earn
  - Yes · `is_active` · radio · required
  - No · `is_active` · radio · required
- [button] Back
- [button] Save & Close
- [button] Save

#### More Options › Wallet › Activity Plans › My Activity Plans

`/fitness-center/activity/activity-list/`

Headings: Activity Listing
Columns: Activity Name | Activity Code | Activity Category | Status | Price | Created by | Action
Actions: Reset Password · Log Out · Search

Form 2:
- **Activity Listing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
  - `activity_category` · select · options: Select Category, Refer & Earn
  - `check-all-box` · checkbox

#### More Options › Wallet › Activity Traffic

`/fitness-center/activity/activity-traffic/`

Headings: Activity Traffic Insights
Columns: Name | Activity | Time Duration | Start Time | End Time | Time Consumed | Amount
Filter labels: From
Actions: Reset Password · Log Out · Submit · All Categories · Refer & Earn

Form 2:
- **Activity Traffic Insights**
  - To · `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
- [button] Submit
  - To · `dropdown` · select · options: Today (08 October 2026), Last 7 Days (01 October 2026 - 08 October 2026), Last 15 (23 September 2026 - 08 October 2026), Last 30 Days (08 September 2026 - 08 October 2026), Custom (08 October 2026 - 08 October 2026)
  - `end_picker_date` · text
  - `start_picker_date` · text

#### More Options › Wallet › Wallet Register

`/fitness-center/activity/activity-register/`

Headings: Wallet Register Listing
Columns: Customer Name | Client Rep | Transaction Date | Transaction Amount | Transaction Type
Filter labels: From · Client Rep
Actions: Reset Password · Log Out · Search · Export to CSV · Submit · Back · Next

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **Wallet Register Listing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
- [button] Export to CSV
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `client_rep` · select · options: {15 people/records}
- [button] Back
- [button] Next

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

### More Options › E-commerce

#### More Options › E-commerce › Create Store

`/ecommerce/store/basic-information/`

Headings: StoreBasic Information
Filter labels: Store Name * · Company Name * · Tagline · Description · Store Logo · Store Cover Pic · Address One · Address Two · City · State · Country · GST No. · GST Type · Packaging Charges() · Minimum Amount To Apply Delivery Charge() · Contact No. · Landline No. · Whatsapp No. · Website Link · Facebook Link · Instagram Link · Twitter Link · Youtube Link
Actions: Reset Password · Log Out · Cancel · Save & Next · Save

Form 2:
  - eg. Fitness store · `store_name` · text · required
  - `company_name` · text · required
  - Same as Store Name · `same_company_name` · checkbox
  - eg. Where Trust Build · `store_tagline` · text
  - Write nice & sweet store description. · `store_description` · textarea
  - `store_logo` · file
  - `store_cover_pic` · file
  - `company_address_1` · text
  - `company_address_2` · text
  - `company_city` · text
  - `company_state` · text
  - `company_country` · text
  - Eg. 22AAAAA0000A1Z5 · `company_gst_no` · text
  - Inclusive · `gst_type` · radio
  - Exclusive · `gst_type` · radio
  - `packaging_charges` · number
  - `min_amt_for_delivery_charge` · number
  - GST No. · `company_contact_no` · text
  - GST No. · `company_landline_no` · text
  - GST No. · `company_whatsapp_no` · text
  - GST No. · `company_website` · text
  - GST No. · `company_fb_link` · text
  - GST No. · `company_insta_link` · text
  - GST No. · `company_twitter_link` · text
  - GST No. · `company_youtube_link` · text
- [button] Cancel
- [button] Save & Next
- [button] Save

#### More Options › E-commerce › Store List

`/ecommerce/store-list/`

Headings: Store Listing
Columns: Store Code | Store Name | Store Description | Action
Actions: Reset Password · Log Out · Search · Delete · Deactivate · Activate · Create Store · Active · Edit · View

Form 2:
- **Store Listing**
  - Search · `search_list` · text
- [button] Search
- [button] Delete
- [button] Deactivate
- [button] Activate
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS Store ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO DEACTIVATE THIS STORE ?**
- [button] Yes
- [button] No
- [button] x
- **ARE YOU SURE YOU WANT TO ACTIVATE THIS STORE ?**
- [button] Yes
- [button] No
  - `check-all-box` · checkbox
- [button] Active

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS Store ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DEACTIVATE THIS STORE ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO ACTIVATE THIS STORE ?** — buttons: No

Opens: `/ecommerce/store-edit/Store-{id}/` · `/ecommerce/view-store/Store-{id}/`

#### More Options › E-commerce › Client Orders

`/ecommerce/product-order-list/`

Headings: OrdersListing
Columns: Customer Name | Order Id | Order Date | Total Items Count | Total Price | Received Amount | Balance Amount | Payment Type | Order Type | Order Status | Payment Status | Action
Actions: Reset Password · Log Out · Search · View Delivery · Export to CSV · Back · Next

Form 2:
- **OrdersListing**
  - Search · `search_list` · text
- [button] Search
  - `payment_type` · select · options: Select Payment Type, Online, Cash, Card, UPI
  - `pay_status` · select · options: Select Payment Status, Paid, Pending, Cancelled, Failed
  - `delivery_status` · select · options: Select Order Status, Cancelled, Pending, Confirmed, Collected
- [button] Export to CSV
- [button] Back
- [button] Next
- [button] ×
- **Update Payment Details**
  - Total Price () · `total_price` · number
  - Received Amount () · `received_amount` · number
  - Balance Amount () · `balance_amount` · number
- [button] Cancel
- [button] Save

Pop-up: **Update Payment Details** — buttons: Cancel, Save
  - Total Price () · `total_price` · number
  - Received Amount () · `received_amount` · number
  - Balance Amount () · `balance_amount` · number

## Log Out

`/fitness-center/logout/` (not captured)

### Quick Billing

`/fitness-center/customer/quick-add-customer-subscription/`

Headings: Quick Billing · Select A Client · Add New Member · Assign Membership
Filter labels: Select A Member * · Member Name * · Member Email * · Mobile Number * · Gender * · Client Rep* · Date of Birth · Source Promotion · Address · Select Image · Add a photo · Please add the photo! · Select Membership * · Start Date * · End Date * · Base Price · Selling Price * · Total () · Received Amount · Payment Method · Payment Status · Next Balance Due Date · Notes · Assign Trainer · Total Sessions · Receipt Number · Invoice Date * · Receipt Date · Bill Rep * · Select A Batch · Hold down "Control", or "Command" on a Mac, to select more than one.
Actions: Search · Open WebCam · Save & Continue

Form 1:
- **Select A Client**
  - Search by Name or Mobile Number or Email · `search_list` · text
- [button] Search

Form 2:
- **Add New Member**
  - Member Name * · `customer_first_name` · text · required
  - Member Name * · `customer_last_name` · text · required
  - [redacted] · `email` · text · required
  - `country_code` · text
  - [redacted] · `mobileNo` · text · required
  - Customer reluctant to give Mobile Number. · `add_alternate` · checkbox
  - Male · `gender` · radio · required
  - Female · `gender` · radio · required
  - Other · `gender` · radio · required
  - `created_by` · select · options: {7 people/records}
  - 18/07/1998 · `dob` · text
  - `source_promo` · select · options: Unknown, Google Ads, Facebook, Instagram, Word Of Mouth, Banner, Walk In, Passing By, Member Referral, Poster, SMS, Website, Flyers, Hoarding, Country Club, Message, Phone, Other, Just Dial, Hotel Guest, Database 1, Database 2, Database 3, Database 4, Database 5 … (+13)
  - Street/ Area · `street1` · text
  - Add a photo · `center_logo` · file
- [button] x
- **Set Profile Picture**
- [button] Take Snapshot
- [button] Done
- [button] Open WebCam
- **Assign Membership**
  - `membership_plan` · select · required · options: {24 people/records}
  - dd-mm-yyyy · `start_date` · text · required
  - dd-mm-yyyy · `end_date` · text · required
  -  0.00 · `base_plan_price` · text · required
  -  0.00 · `plan_price` · text · required
  -  0.00 · `emi_payment_price` · number
  - `pay_method` · select · required · options: CASH, ONLINE, UPI, Credit Card, Debit Card, Card, PAYTM, Bajaj EMI, Cheque, NEFT or Bank Transfer, RazorPay, Google Pay, PhonePe, PayPal, Fitternity, FIT PASS, Paper finance, Payed App, IDFC- S, IDFC- K, HDFC, Save In, Tabby, Tabby Card, Postpay … (+8)
  - `pay_status` · select · options: Paid, Pending
  - dd-mm-yyyy · `schedule_payment_date` · text
  - e.g. Cheque no./NEFT Transaction · `pay_comment` · text
  - `trainer_trail_select` · select · options: Select Trainer
  -  0 · `pt_sessions` · number
  - `receipt_no` · text
  - `invoice_date` · text
  - dd-mm-yyyy · `payment_date` · text
  - `bill_representative` · select · options: {14 people/records}
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m., 9:00 AM - 10:30 AM 9 a.m. … (+1)
- [button] Save & Continue

Pop-up: **Set Profile Picture** — buttons: Done

### Notifications

`/fitness-center/notifications/`

Headings: Notifications Listing
Columns: Notification Type | Time | Notification | Action
Actions: Reset Password · Log Out

Form 2:
- **Notifications Listing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)

### Follow Up Dashboard (new)

`/merchant/fitness-center/customers/follow-up-list-new/`

Headings: Follow Up Dashboard Welcome, [person]
Filter labels: Gender · Convertibility · Call Response · Assign To · What would you like to do ? · From · Comment Added By · Client Rep. · Follow Up Type · Client Type
Actions: Reset Password · Log Out · Delete · Transfer Follow ups · View Analysis · Export to CSV · Search

Form 2:
- **Follow Up Dashboard Welcome, [person]**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
- [button] Delete
- [button] Transfer Follow ups
- [button] x
- **Transfer Follow Ups**
- **Transfer From**
  - Select Staff from · `transfer_from` · select · required · options: {6 people/records}
- **Transfer to**
  - Select Staff from · `transfer_to` · select · required · options: {6 people/records}
- [button] Close
- [button] Transfer follow ups
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE SELECTED FOLLOW-UP ?**
- [button] Yes
- [button] No
  - `gender_select` · select · options: All, Male, Female, Other
  - `convert_select` · select · options: All Convertibility, Hot, Warm, Cold, Expected, Unpitched
  - `type_select` · select · options: All Status, Open, Follow Ups Done, Not Interested, Successfull
  - Assign To · `staff_assign_select` · select · options: {8 people/records}
  - What would you like to do ? · `cust_followup_type` · select · options: Missed /Due Follow Ups, Follow Ups Done, Expected Follow Ups
  - `end_picker_date` · text
  - `start_picker_date` · text
  - Comment Added By · `comment_added_select` · select · options: All Staff, System Generated, [person], [person], [person], [person], [person], [person]
  - Client Rep. · `client_rep_select` · select · options: {7 people/records}
  - `followup_type` · select · options: All Follow Up Type, Membership Renewal, Enquiry, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Referral, Transfer, Upgrade, Online Prospect(Non gym), Online Training, Trial Online PT, Trial Online PT Feedback, Nutrition, Other, Ex-Member, Ready To Sign Up … (+4)
  - `client_select` · select · options: All, Enquiry, Member
- [button] Export to CSV
- [button] Search
  - `show_staff_insights` · checkbox

Pop-up: **Transfer Follow Ups** — buttons: Transfer follow ups
  - Select Staff from · `transfer_from` · select · required · options: {6 people/records}
  - Select Staff from · `transfer_to` · select · required · options: {6 people/records}

Pop-up: **ARE YOU SURE YOU WANT TO DELETE SELECTED FOLLOW-UP ?** — buttons: No

### Create Workout Plan

`/fitness-center/workout-plan/basic-information/`

Headings: Workout Plan Basic Information · Customer's Goal · Customer's Level · Select Trainer
Filter labels: Workout Plan Name * · Goals * · Level * · Assign By Trainer · Number of Days in a Week* · Total Days · Important Instruction
Actions: Reset Password · Log Out · Back · Save & Next · Save

Form 2:
  - e.g. Beginner 3 Days Workout Plan · `wk_plan_name` · text · required
- **Customer's Goal**
  - Fat Loss · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Weight Gain · `goals` · radio · required
  - General Fitness · `goals` · radio · required
  - Over all fitness · `goals` · radio · required
  - Sports Specific · `goals` · radio · required
  - Marathon Training · `goals` · radio · required
  - Lean Toning · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Strength building · `goals` · radio · required
  - Calisthenics · `goals` · radio · required
  - Stamina building · `goals` · radio · required
  - Maintain Weight · `goals` · radio · required
  - Sports specific purpose · `goals` · radio · required
  - Sports Specific Purpose · `goals` · radio · required
  - Active Rest Cardio · `goals` · radio · required
  - Deep Fasting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Maintain whole body · `goals` · radio · required
  - intense · `goals` · radio · required
  - body element · `goals` · radio · required
  - Body Toning · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Motivate to doing Workout · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Mental Health · `goals` · radio · required
  - begginer · `goals` · radio · required
  - basic course · `goals` · radio · required
  - Fat Loss + Testosterone Boost + T3 & T4 Improvement · `goals` · radio · required
  - immunity · `goals` · radio · required
  - home workout · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - Pain Management · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Improve posture · `goals` · radio · required
  - Body Tone · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Weight gain · `goals` · radio · required
  - Strength boosting · `goals` · radio · required
  - Stiff Shoulder · `goals` · radio · required
  - Increase football skills · `goals` · radio · required
  - yoga · `goals` · radio · required
  - Massage · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve strength · `goals` · radio · required
  - Muscle Endurance · `goals` · radio · required
  - strength · `goals` · radio · required
  - improve Muscle blood flow · `goals` · radio · required
  - Full Body Energizer · `goals` · radio · required
  - Sports specific · `goals` · radio · required
  - Performance · `goals` · radio · required
  - Shoulder Rehab · `goals` · radio · required
  - circuit training · `goals` · radio · required
  - Core conditioning · `goals` · radio · required
  - abc · `goals` · radio · required
  - Rehab Programme · `goals` · radio · required
  - Problem · `goals` · radio · required
  - fat loss · `goals` · radio · required
  - Back problem · `goals` · radio · required
  - demo · `goals` · radio · required
  - improve balance · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Improve time · `goals` · radio · required
  - Aerobic base · `goals` · radio · required
  - Heart rate · `goals` · radio · required
  - Rehab · `goals` · radio · required
  - Inch loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - strength training · `goals` · radio · required
  - Running · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - fat loss,muscle tune · `goals` · radio · required
  - strength and size gain · `goals` · radio · required
  - muscle gain, fat loss · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - muscle gain · `goals` · radio · required
  - fat loss , weight gain , mussscle build · `goals` · radio · required
  - marathon · `goals` · radio · required
  - marathon · `goals` · radio · required
  - Marathon · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Fat loss muscle gain · `goals` · radio · required
  - diabetic management · `goals` · radio · required
  - diabetic diet plan · `goals` · radio · required
  - Postural training · `goals` · radio · required
  - Awareness · `goals` · radio · required
  - increase bench press capacity · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Toning · `goals` · radio · required
  - Muscle gain & Fat loss · `goals` · radio · required
  - STRENGTHENING · `goals` · radio · required
  - MOBILITY & JOINT CONDITION · `goals` · radio · required
  - RELAX MUSCLE · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Power lifting · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - Kidney · `goals` · radio · required
  - Yoga Satvik Diet plan · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve Flexibility · `goals` · radio · required
  - Overall health and immunity · `goals` · radio · required
  - Injury rehabilitation · `goals` · radio · required
  - Build Body strength · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Diabetes · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Muscle Gain N Toning · `goals` · radio · required
  - Build Strength Endurance · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - peak week · `goals` · radio · required
  - TRANSFORMATION · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Building abs · `goals` · radio · required
  - foundation · `goals` · radio · required
  - Muscle building · `goals` · radio · required
  - self defense level 1 · `goals` · radio · required
  - FAT LOSS · `goals` · radio · required
  - Muscular Endurance and Stamina · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Building abs · `goals` · radio · required
  - acting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - general · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Overall Health Immunity and Fatloss · `goals` · radio · required
  - Overall Health and Lean Muscle Gain · `goals` · radio · required
  - fitness · `goals` · radio · required
  - Mental health · `goals` · radio · required
  - Detoxify the body · `goals` · radio · required
  - increase speed · `goals` · radio · required
  - Strength and stamina increase, Fatloss · `goals` · radio · required
  - weight gain · `goals` · radio · required
  - Fat Loss N Toning · `goals` · radio · required
  - Pain management · `goals` · radio · required
  - Improve muscular strength · `goals` · radio · required
  - Improve joint range of motion · `goals` · radio · required
  - home program · `goals` · radio · required
  - Pain Control · `goals` · radio · required
  - Improve Joint ROM · `goals` · radio · required
  - Improve Muscle Power · `goals` · radio · required
  - Improve Balance & Coordination · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Improve Breathing capacity · `goals` · radio · required
  - Improve ADL · `goals` · radio · required
  - Fat Loss · `goals` · radio · required
  - Calf moulding · `goals` · radio · required
  - lean muscle fatloss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - increase height · `goals` · radio · required
  - increase height · `goals` · radio · required
  - Recomposition · `goals` · radio · required
  - Wight loss & muscle gain · `goals` · radio · required
  - Body Conditioning · `goals` · radio · required
  - Transform · `goals` · radio · required
  - Get Started · `goals` · radio · required
  - Knee Pain Senior citizens · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - bb · `goals` · radio · required
  - Super Transformation · `goals` · radio · required
  - beginner · `goals` · radio · required
  - beginner · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - strength build-up & toning · `goals` · radio · required
  - for normal delivery · `goals` · radio · required
  - warm muscles and joints · `goals` · radio · required
  - Fat loss muscle building · `goals` · radio · required
  - Toning 1.1 ( Resistance Band) · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Lean Muscle & Toning · `goals` · radio · required
  - Fat Loss & Improve overall Health · `goals` · radio · required
  - Lean & Photoshoot Ready Physique · `goals` · radio · required
  - Strength Building & Improve HM Timing · `goals` · radio · required
  - Fat loss & Lean physique · `goals` · radio · required
  - Full body · `goals` · radio · required
  - Weight loss & toning · `goals` · radio · required
  - new · `goals` · radio · required
  - Diabetes Diet Plan · `goals` · radio · required
  - lunch capacity enhance · `goals` · radio · required
  - Weight Loss & Fat Loss · `goals` · radio · required
  - Build Strength · `goals` · radio · required
  - Fat Loss & Beach Ready · `goals` · radio · required
  - - · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Fat Loss · `goals` · radio · required
  - Weight Loss / Fat Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - WEIGHT LOSS · `goals` · radio · required
  - Weight Loss & General Fitness · `goals` · radio · required
  - Strength Building and Marathon Training · `goals` · radio · required
  - Strength Building and Train for Ultra 50K · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Fat Loss and Wellness · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - BODY RECOMPOSITION · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - massive gan · `goals` · radio · required
  - detoxification · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Increasing Power · `goals` · radio · required
  - Functional training · `goals` · radio · required
  - Daily Movement · `goals` · radio · required
  - Weight Lose · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Lean Mass · `goals` · radio · required
  - Warm Up · `goals` · radio · required
  - Lean Mass · `goals` · radio · required
  - Lean mass · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - healthy lifestyle · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Recomposition · `goals` · radio · required
  - Toning · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss and Muscle gain · `goals` · radio · required
  - Lean mass · `goals` · radio · required
  - Lower Body · `goals` · radio · required
  - ABS · `goals` · radio · required
  - increase stamina · `goals` · radio · required
  - get fit · `goals` · radio · required
  - Weight Loss 1.2K · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - HYPERTROPHY · `goals` · radio · required
  - 1st Prep · `goals` · radio · required
  - height gain · `goals` · radio · required
  - build muscle, increasing mobility and flexibility. · `goals` · radio · required
  - Warm Up · `goals` · radio · required
  - Recovery · `goals` · radio · required
  - Maintain fitness · `goals` · radio · required
  - maintain fitness · `goals` · radio · required
  - Running · `goals` · radio · required
  - Running & Fitness · `goals` · radio · required
  - At Home Exercise For Weight Loss · `goals` · radio · required
  - general · `goals` · radio · required
  - general · `goals` · radio · required
  - EMPTY · `goals` · radio · required

### Edit Combo Offer

`/merchant/fitness-center/edit-combo-offer/{id}/`

Headings: Create Combo Offer · Combo Offer Name · Select Plan Category · Select Membership Plan · Hold down "Control", or "Command" on a Mac, to select more than one.
Columns: Plan Name | Fitness center | Services | Status | Tenure | Price | Discount Price | Selling Price | Created by
Actions: Reset Password · Log Out · Combo Offer List · Create New Combo Offer · Update · Delete · Active

Form 2:
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS membership plan ?**
- [button] Yes
- [button] No
- **Create Combo Offer**
- **Combo Offer Name**
  - Enter offer name · `combo_offer` · text · required
- **Select Plan Category**
  - `plan_category` · select · options: Select Category, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
- **Select Membership Plan**
  - `membership` · multiselect · options: {23 people/records}
- **Hold down "Control", or "Command" on a Mac, to select more than one.**
- [button] Update
- [button] Delete
  - `check-all-box` · checkbox
- [button] Active
- [button] Active

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS membership plan ?** — buttons: No

### Edit Quick Action Item

`/fitness-center/action/quick-action-item/{id}/`

Headings: Quick Action Item Basic Information
Filter labels: Quick Action Item Name* · Add Icon * · Add Colour * · Active · Add Link Name* · Show the Quick Action item to* · Add Link Id · Add Quick Action Item Id · Ordering
Actions: Reset Password · Log Out · Show Optional Fields · Save · Save & add another

Form 2:
  - `fc_text` · text · required
  - `fc_icon` · select · required · options: Select Icon, Free Workout, Claim Free Course, Browse Plans, Free Class, Buy Courses, Recipes, Track Your Diet, Message, WhatsApp, Personal Trainer, Medicine, Laboratory, Facebook, Instagram, Search, Contact Us, Website, Body Transformation, Products Icon, My Profile, My Diet Plan, My Coupons
  - `fc_color_code` · color · required · default #000000
  - Is active · `fc_is_active` · checkbox
  - `fc_link` · select · required · options: Select Link Name, About Us, Add diary/notes, Add measurement, Add post in community, Appointment Screen, Articles Screen, Checkins or Attendance Calendar, Challenges List, Coach Profile, Trainer Profile, Dietician/Nutritonist profile, Community homepage, Classes Listing, Coaches or Trainers or Dieiticians Listing, Coach Tab or PT Details Tab or Sessions Tab, Contact us, Custom Client Form with History, Custom Screen, Diary list, Diet Analysis, Exercise Analysis, External Web link (redirects user to external web browser or app), Feedback, Fitness form, health form, PARQ form, Fitness Center Notices, Fitness Center Rules … (+27)
  - Both (Paid/Free) · `sub_type` · radio
  - Paid Users · `sub_type` · radio
  - Free Users · `sub_type` · radio
  - Active PT or Personalised Plan Clients · `sub_type` · radio
  - Clients with Active general plan but no personalised plans · `sub_type` · radio
  - Clients with All Expired plans · `sub_type` · radio
- [button] Show Optional Fields
  - `fc_link_Id` · text
  - `fc_aid` · text
  - `fc_ordering` · number · default 0
- [button] Save
- [button] Save & add another

### Edit Store

`/ecommerce/store-edit/Store-{id}/`

Headings: StoreBasic Information
Filter labels: Store Name * · Company Name * · Tagline · Description · Store Logo · Image · Check to remove image · Store Cover Pic · Address One · Address Two · City · State · Country · GST No. · GST Type · Packaging Charges() · Minimum Amount To Apply Delivery Charge() · Contact No. · Landline No. · Whatsapp No. · Website Link · Facebook Link · Instagram Link · Twitter Link · Youtube Link
Actions: Reset Password · Log Out · Cancel · Save & Next · Save

Form 2:
  - eg. Fitness store · `store_name` · text · required
  - `company_name` · text · required
  - Same as Store Name · `same_company_name` · checkbox
  - eg. Where Trust Build · `store_tagline` · text
  - Write nice & sweet store description. · `store_description` · textarea
  - `store_logo` · file
  - Check to remove image · `store_logo` · checkbox
  - `store_cover_pic` · file
  - Check to remove image · `store_cover_pic` · checkbox
  - `company_address_1` · text
  - `company_address_2` · text
  - `company_city` · text
  - `company_state` · text
  - `company_country` · text
  - Eg. 22AAAAA0000A1Z5 · `company_gst_no` · text
  - Inclusive · `gst_type` · radio
  - Exclusive · `gst_type` · radio
  - `packaging_charges` · number
  - `min_amt_for_delivery_charge` · number
  - GST No. · `company_contact_no` · text
  - GST No. · `company_landline_no` · text
  - GST No. · `company_whatsapp_no` · text
  - GST No. · `company_website` · text
  - GST No. · `company_fb_link` · text
  - GST No. · `company_insta_link` · text
  - GST No. · `company_twitter_link` · text
  - GST No. · `company_youtube_link` · text
- [button] Cancel
- [button] Save & Next
- [button] Save

Opens: `/ecommerce/Store-{id}/location/`

### Store Orders

`/ecommerce/view-store/Store-{id}/`

Headings: My Orders · Cancelled · 0 · Pending · Confirmed · Collected · Add category in store from here · View all listed category from here · Add Product in the store from here · View all listed product from here · My Orders Today's Order
Columns: Order ID | Product Name | Customer Name | Delivery Pincode | Status
Actions: Reset Password · Log Out · Profile · See All orders

Form 2:
- [button] Profile
- **My Orders**
- **Cancelled**
- **0**
- **[row value]**
- **... repeated once per row (4 rows on the page)**

Opens: `/ecommerce/delivery-slots-list/Store-{id}/` · `/ecommerce/add-delivery-slots/Store-{id}/` · `/ecommerce/Store-{id}/coupons-list/` · `/ecommerce/Store-{id}/coupon-basic-information/` · `/ecommerce/Store-{id}/location/` · `/ecommerce/store-edit/Store-{id}/` · `/ecommerce/Store-{id}/product-category/` · `/ecommerce/Store-{id}/add-product/` · `/ecommerce/Store-{id}/product-list/`

### External Tab

`/external-tab/`

Headings: Shaan Fitness Gym · Click here to Mark your Attendance
Columns: Link Name | Link | Qr Code
Actions: Copy Link · Download QR

Opens: `/fitness-center/customer/checkin-card/0/{id}/` · `/static/fitness_center/qr_code/CheckIn_{id}.png`

## Detail pages (opened from the lists above)

### Enquiry

`/fitness-center/customer/folloup-history/Customer-{id}/0/`

Headings: Enquiry · [person] · Membership Actions · Remarks
Columns: # | Membership Plan | Start Date | End Date | Base Price | Selling Price | Apply Coupon | Action
Columns: Followup Type | Followup Date | Reminder Date | Comments | Follow up Status | Added By | Follow Up By | Action | Follow Up Date | Follow Up Assign to | Follow Up Type | Comment | Follow Up by
Columns: Follow Up Date | Follow Up Assign to | Follow Up Type | Comment
Columns: Follow Up Date | Follow Up Assign to | Follow Up by | Follow Up Type | Comment
Filter labels: Add a photo
Actions: Reset Password · Log Out · Open WebCam · Remove Photo · Check in · Send WhatsApp Message · Place Order · See Follow Up History · View Participated Challenges · Assign Personal Training · Book a free Trial · Add Subscription · Assign Combo Offer · Submit · Add Follow up · Follow up Response · View Resolution · Back · Next

Form 2:
- [button] x
- **Send Notification**
- **[person]**
- **Notification**
  - Make sure your title is short and explanatory. · `noti_name` · text · required
- **Notification Body**
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea · required
- [button] Close
- [button] Send Notification

Form 3:
- [button] x
- **Add Workout**
- **[person]**
- **Weight**
  - Customer's Weight · `weight` · number · required
- **Height**
  - feet · `height_feet` · number · required
  - inch · `height_inch` · number · required
- **Customer's Goal**
- **Customer's Level**
- **Workout Plan**
  - `workout_plan` · select · options: Select Workout Plan
- **Workout Days**
  - Monday · `days_of_week` · checkbox · required
  - Tuesday · `days_of_week` · checkbox · required
  - Wednesday · `days_of_week` · checkbox · required
  - Thursday · `days_of_week` · checkbox · required
  - Friday · `days_of_week` · checkbox · required
  - Saturday · `days_of_week` · checkbox · required
  - Sunday · `days_of_week` · checkbox · required
- [button] Close
- [button] Assign Workout

Form 4:
- [button] x
- **Send Whatsapp Message**
- **[person]**
- **Message Body**
  - Enter a message that you want to send to customer. · `message_body` · textarea
- [button] Close
- [button] Send Message

Form 5:
- [button] x
- **Send Whatsapp Message**
- **[person]**
- **Message Body**
  - Enter a message that you want to send to customer. · `whatsapp_message_body` · textarea
- [button] Close
- [button] Send Message

Form 6:
- [button] x
- **[person]**
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - `renew_start_date` · text
- [button] Apply
- [button] Add more plan
  - [redacted] · `customer_email` · text · required
  - Enter Member Code · `couple_cust_id` · text
- **Select A Batch**
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- [button] Close
- [button] Add Subscription

Form 7:
- [button] x
- **Freeze Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `freeze_membership_plan` · select · required · options: Select Subscription
  - dd-mm-yyyy · `freeze_start_date` · text
  - `freeze_days` · number · required
- **Freeze Subscription Fees**
  - Freeze for Days · `freeze_price` · text
  - Freeze for Days · `freeze_note` · text
- [button] Close
- [button] Freeze Subscription

Form 8:
- [button] x
- **Extend Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `extend_membership_plan` · select · required · options: Select Subscription
- **Your Extension starts from the next day of selected Subscription End date**
  - `extend_days` · number · required
- **Extension Subscription Fees**
  - Freeze for Days · `extend_price` · text · required
  - Freeze for Days · `extendsion_note` · text
- [button] Close
- [button] Extend Subscription

Form 9:
- [button] x
- **Transfer Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `transfer_membership_plan` · select · required · options: Select Subscription
- **Transfer to**
  - Enter Member Code/Enquiry Code/Phone Number · `cust_id` · text · required
- **Joining Date**
  - `start_date` · text · required
  - End Date · `end_date` · text
- **Transfer Subscription Fees**
  - Freeze for Days · `transfer_price` · text
- [button] Close
- [button] Transfer Subscription

Form 10:
- [button] x
- **Upgrade Subscription**
- **[person]**
- **Subscription Selection**
  - Select Subscription · `sub_upgrade_membership_plan` · select · required · options: Select Subscription you wish to upgrade
  - Check Group to add subscription · `has_couple_check` · checkbox
- **Upgrade to Membership**
  - `upgrade_membership_plan` · select · required · options: {24 people/records}
- **Joining Date**
  - Start Date · `upgrade_start_date` · text · required
  - End Date · `upgrade_end_date` · text · required
- **Plan Price**
  - Base Price · `base_price` · text
  - Subscription Paid Price · `id_subscription_paid_price` · text
  - Sales Price · `sales_price` · text · required
- **Coupon Code**
  - Coupon Code · `upgrade_coupon_code` · text
- [button] Apply
- [button] Close
- [button] Upgrade Subscription

Form 11:
- [button] x
- **[person]**
- **Membership Selection**
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - Select Membership · `searchboxpt` · text · required
  - Search... · `membership_plan-0` · text
  - [redacted] · `customer_email` · text · required
  - Select Trainer · `searchboxptt` · text · required
  - Search... · `trainer_trail_select-0` · text
  - `second_trainer_trail_select` · multiselect · options: {16 people/records}
  - `pt_points-0` · number · required · default 0
  - `pt_sessions-0` · number · required
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Yes · `devide_sessions_between_couple` · radio
  - No · `devide_sessions_between_couple` · radio
- **Make a Payment**
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code` · text
- [button] Apply Code
- **Select A Batch**
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- [button] Close
- [button] Add Subscription

Form 12:
- [button] x
- **Downgrade Subscription**
- **[person]**
- **Subscription Selection**
  - `downgrade_subscription` · select · required · options: Select Subscription
- **Downgrade to Membership**
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `membership_plan-0` · select · required · options: Please Select Subscription
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
- **Plan Price**
- **Previous Plan Paid Amount**
- **Refund Amount:**
- **Previous Plan Price:**
- **New Plan Price:**
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - Freeze for Days · `downgrade_note` · text
- [button] Close
- [button] Downgrade Subscription

Form 13:
- [button] x
- **Book a Trial**
- **[person]**
- **Membership Selection**
  - `membership_plan-0` · select · required · options: Select Membership, Free Trail - PT
  - `trainer_trail_select-0` · select · required · options: {17 people/records}
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `pt_sessions-0` · number · required
- **Make a Payment**
  - `plan_price-0` · text · required
- [button] Close
- [button] Add Subscription

Form 14:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- [button] Close
- [button] Add Member to Device

Form 15:
- [button] x
- **Delete Member from device**
- **[person]**
- [button] Close
- [button] Delete Member to Device

Form 16:
- [button] x
- **Activate Member from device**
- **[person]**
- [button] Close
- [button] Activate Member to Device

Form 17:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- **Notice**
- [button] Close
- [button] Add Member & Fingerprint

Form 18:
  - Add a photo · `center_logo` · file
- [button] x
- **Set Profile Picture**
- [button] Take Snapshot
- [button] Set As Profile Picture
- [button] Cancel
- [button] Open WebCam
- [button] Remove Photo
- **[person]**
- [button] Check in
- **[row value]**
- [button] Assign Personal Training
- [button] Book a free Trial
- [button] Add Subscription
- **[row value]**
  - `my_followup_type` · select · options: All Followup, Membership Renewal, Enquiry, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Online Prospect(Non gym), Online Training, Trial Online PT, Trial Online PT Feedback, Nutrition, Other, Ex-Member, Ready To Sign Up, PT Follow-up, Demo Scheduled, Demo Conducted … (+2)
- [button] x
- **[row value]**
- **... repeated once per row (3 rows on the page)**

Form 19:
- **Remarks**
  - `my_followup_type` · select · options: All Followup, Membership Renewal, Enquiry, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Online Prospect(Non gym), Online Training, Trial Online PT, Trial Online PT Feedback, Nutrition, Other, Ex-Member, Ready To Sign Up, PT Follow-up, Demo Scheduled, Demo Conducted … (+2)
- [button] x
- **Schedule Follow Up**
- **[person]**
- **Follow up Details**
- **[date]**
- [button] Cancel
- [button] Confirm
- **Member Follow Up History**
- [button] See history
- [button] x
- **Schedule Follow Up**
- **[person]**
- **Follow up Details**
- **[date]**
- **Hot**
- **Follow Ups Done**
- **[date]**
- **[person]**
- **No answer**
- [button] Cancel
- **Member Follow Up History**
- [button] See history
- [button] Back
- [button] Next

Form 20:
- [button] x
- **Schedule Follow Up**
  - `follow_up_type_` · select · options: Enquiry, Membership Renewal, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Referral, Transfer, Upgrade, Online Prospect(Non gym), Online Training, Trial Online PT, Trial Online PT Feedback, Nutrition, Massage, Other, Ex-Member, Ready To Sign Up … (+9)
  - Assign To * · `employee_select_` · select · options: {7 people/records}
  - Response * · `followup_response_` · select · required · options: Open Follow up, Successfull Follow up, Not Interested - Rates to high, Not Interested - Joined Another Gym, Not Interested - Wrong number, Not Interested - Relocated, Not Interested - other
  - Convertibility * · `lead_type_` · select · required · options: Hot, Warm / Maybe, Cold / Not so interested, Expected, Successfull Follow up, Unpitched
  - `expected_date_` · date
  - `expected_amt_` · number
  - Next Follow Up Date * · `followup_date_` · text
  - Contact Type * · `contact_type_` · select · required · options: Phone, In Person, Email, Whatsapp, SMS
  - To Do/Comment * · `followup_notes_` · textarea
  - `quick_msg` · select · options: Quick Message, Not reachable, No answer, Waiting, Busy, Incorrect, Interested, Switch Off, Call, JOINING CALL, COURTESY CALL, Call Again, JOINING CALL, COURTESY CALL, Inquired but did not ask for payment, Inquired & Payment link sent or to be sent., Call later same day or tomorrow or some other month, Costly Can not afford, Phone Cut, Half Call.Call again, Not Interested, Inquired by mistake, Joined Somewhere else, Other
- [button] Cancel
- [button] Confirm

Pop-up: **Send Notification** — buttons: Send Notification
  - Make sure your title is short and explanatory. · `noti_name` · text · required
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea · required

Pop-up: **Add Workout** — buttons: Create A Workout Plan, Assign Workout
  - Customer's Weight · `weight` · number · required
  - feet · `height_feet` · number · required
  - inch · `height_inch` · number · required
  - `workout_plan` · select · options: Select Workout Plan
  - Monday · `days_of_week` · checkbox · required
  - Tuesday · `days_of_week` · checkbox · required
  - Wednesday · `days_of_week` · checkbox · required
  - Thursday · `days_of_week` · checkbox · required
  - Friday · `days_of_week` · checkbox · required
  - Saturday · `days_of_week` · checkbox · required
  - Sunday · `days_of_week` · checkbox · required

Pop-up: **Send Whatsapp Message** — buttons: Send Message
  - Enter a message that you want to send to customer. · `message_body` · textarea

Pop-up: **SubscriptionModal** — buttons: Lookup Member code, Lookup Enquiry code, Add Subscription
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - `renew_start_date` · text
  - Select Membership · `searchbox` · text · required
  - Search... · `membership_plan-0` · text
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code-0` · text
  - [redacted] · `customer_email` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)

Pop-up: **Freeze Subscription** — buttons: Freeze Subscription
  - Select Membership · `freeze_membership_plan` · select · required · options: Select Subscription
  - dd-mm-yyyy · `freeze_start_date` · text
  - `freeze_days` · number · required
  - Freeze for Days · `freeze_price` · text
  - Freeze for Days · `freeze_note` · text

Pop-up: **Extend Subscription** — buttons: Extend Subscription
  - Select Membership · `extend_membership_plan` · select · required · options: Select Subscription
  - `extend_days` · number · required
  - Freeze for Days · `extend_price` · text · required
  - Freeze for Days · `extendsion_note` · text

Pop-up: **Transfer Subscription** — buttons: Lookup Member code, Lookup Enquiry code, Transfer Subscription
  - Select Membership · `transfer_membership_plan` · select · required · options: Select Subscription
  - Enter Member Code/Enquiry Code/Phone Number · `cust_id` · text · required
  - `start_date` · text · required
  - End Date · `end_date` · text
  - Freeze for Days · `transfer_price` · text

Pop-up: **Upgrade Subscription** — buttons: Apply, Upgrade Subscription
  - Select Subscription · `sub_upgrade_membership_plan` · select · required · options: Select Subscription you wish to upgrade
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `upgrade_membership_plan` · select · required · options: {24 people/records}
  - Start Date · `upgrade_start_date` · text · required
  - End Date · `upgrade_end_date` · text · required
  - Base Price · `base_price` · text
  - Subscription Paid Price · `id_subscription_paid_price` · text
  - Sales Price · `sales_price` · text · required
  - Coupon Code · `upgrade_coupon_code` · text

Pop-up: **SubscriptionModall** — buttons: Lookup Member code, Lookup Enquiry code, Add Subscription
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - Select Membership · `searchboxpt` · text · required
  - Search... · `membership_plan-0` · text
  - [redacted] · `customer_email` · text · required
  - Select Trainer · `searchboxptt` · text · required
  - Search... · `trainer_trail_select-0` · text
  - `second_trainer_trail_select` · multiselect · options: {16 people/records}
  - `pt_points-0` · number · required · default 0
  - `pt_sessions-0` · number · required
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Yes · `devide_sessions_between_couple` · radio
  - No · `devide_sessions_between_couple` · radio
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code` · text
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)

Pop-up: **Downgrade Subscription** — buttons: Downgrade Subscription
  - `downgrade_subscription` · select · required · options: Select Subscription
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `membership_plan-0` · select · required · options: Please Select Subscription
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - Freeze for Days · `downgrade_note` · text

Pop-up: **Book a Trial** — buttons: Add Subscription
  - `membership_plan-0` · select · required · options: Select Membership, Free Trail - PT
  - `trainer_trail_select-0` · select · required · options: {17 people/records}
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `pt_sessions-0` · number · required
  - `plan_price-0` · text · required

Pop-up: **Add Member to device** — buttons: Add Member to Device
  - `essl_code` · number · required
  - `rfid` · number · default None

Pop-up: **Delete Member from device** — buttons: Delete Member to Device

Pop-up: **Activate Member from device** — buttons: Activate Member to Device

Pop-up: **Set Profile Picture** — buttons: Set As Profile Picture, Cancel

Pop-up: **Schedule Follow Up** — buttons: Cancel
  - `call_rep` · select · options: {8 people/records}
  - `followup_date` · text
  - Assign To * · `employee_select` · select · options: {7 people/records}
  - Convertibility * · `lead_type` · select · required · options: Hot, Warm / Maybe, Cold / Not so interested, Expected, Unpitched
  - `expected_date` · date
  - `expected_amt` · number
  - `followup_notes` · textarea
  - `quick_msg` · select · options: Quick Message, Not reachable, No answer, Waiting, Busy, Incorrect, Interested, Switch Off, Call, JOINING CALL, COURTESY CALL, Call Again, JOINING CALL, COURTESY CALL, Inquired but did not ask for payment, Inquired & Payment link sent or to be sent., Call later same day or tomorrow or some other month, Costly Can not afford, Phone Cut, Half Call.Call again, Not Interested, Inquired by mistake, Joined Somewhere else, Other
  - `contact_type` · select · required · options: Phone, In Person, Email, Whatsapp, SMS
  - `followup_comment` · textarea
  - `my_followup_type` · select · options: All Followup, Membership Renewal, Enquiry, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Online Prospect(Non gym), Online Training, Trial Online PT, Trial Online PT Feedback, Nutrition, Confirmation Calls, Gym/Studio Trial, Other

Opens: `/fitness-center/customer/basic-information/Customer-{id}/` · `/fitness-center/customer/Customer-{id}/` · `/fitness-center/customer/subscriptions/Customer-{id}/0/` · `/fitness-center/customer/attendance/Customer-{id}/0/ ` · `/fitness-center/customer/workout/Customer-{id}/0/` · `/fitness-center/customer/folloup-history/Customer-{id}/0/` · `/fitness-center/customer/client-form/Customer-{id}/0/` · `/fitness-center/customer/Referral-by/Customer-{id}/0/ ` · `/merchant/fitness-center/customers/enquiry-form/Customer-{id}/` · `/ecommerce/add-order/Customer-{id}` · `/app-challenge/challenge-list/Customer/{id}/` · `/merchant/fitness-center/combo-offer-membership/Customer-{id}/`

### Enquiry

`/fitness-center/customer/subscriptions/Customer-{id}/0/`

Headings: Enquiry · [person] · Membership Actions
Columns: # | Membership Plan | Start Date | End Date | Base Price | Selling Price | Apply Coupon | Action
Columns: Device Name, Type | Device Serial
Filter labels: Add a photo
Actions: Reset Password · Log Out · Open WebCam · Remove Photo · Check in · Send WhatsApp Message · Place Order · See Follow Up History · View Participated Challenges · Assign Personal Training · Book a free Trial · Add Subscription · Assign Combo Offer

Form 2:
- [button] x
- **Send Notification**
- **[person]**
- **Notification**
  - Make sure your title is short and explanatory. · `noti_name` · text · required
- **Notification Body**
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea · required
- [button] Close
- [button] Send Notification

Form 3:
- [button] x
- **Add Workout**
- **[person]**
- **Weight**
  - Customer's Weight · `weight` · number · required
- **Height**
  - feet · `height_feet` · number · required
  - inch · `height_inch` · number · required
- **Customer's Goal**
  - Fat Loss · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Weight Gain · `goals` · radio · required
  - General Fitness · `goals` · radio · required
  - Over all fitness · `goals` · radio · required
  - Sports Specific · `goals` · radio · required
  - Marathon Training · `goals` · radio · required
  - Lean Toning · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Strength building · `goals` · radio · required
  - Calisthenics · `goals` · radio · required
  - Stamina building · `goals` · radio · required
  - Maintain Weight · `goals` · radio · required
  - Sports specific purpose · `goals` · radio · required
  - Sports Specific Purpose · `goals` · radio · required
  - Active Rest Cardio · `goals` · radio · required
  - Deep Fasting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Maintain whole body · `goals` · radio · required
  - intense · `goals` · radio · required
  - body element · `goals` · radio · required
  - Body Toning · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Motivate to doing Workout · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Mental Health · `goals` · radio · required
  - begginer · `goals` · radio · required
  - basic course · `goals` · radio · required
  - Fat Loss + Testosterone Boost + T3 & T4 Improvement · `goals` · radio · required
  - immunity · `goals` · radio · required
  - home workout · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - Pain Management · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Improve posture · `goals` · radio · required
  - Body Tone · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Weight gain · `goals` · radio · required
  - Strength boosting · `goals` · radio · required
  - Stiff Shoulder · `goals` · radio · required
  - Increase football skills · `goals` · radio · required
  - yoga · `goals` · radio · required
  - Massage · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve strength · `goals` · radio · required
  - Muscle Endurance · `goals` · radio · required
  - strength · `goals` · radio · required
  - improve Muscle blood flow · `goals` · radio · required
  - Full Body Energizer · `goals` · radio · required
  - Sports specific · `goals` · radio · required
  - Performance · `goals` · radio · required
  - Shoulder Rehab · `goals` · radio · required
  - circuit training · `goals` · radio · required
  - Core conditioning · `goals` · radio · required
  - abc · `goals` · radio · required
  - Rehab Programme · `goals` · radio · required
  - Problem · `goals` · radio · required
  - fat loss · `goals` · radio · required
  - Back problem · `goals` · radio · required
  - demo · `goals` · radio · required
  - improve balance · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Improve time · `goals` · radio · required
  - Aerobic base · `goals` · radio · required
  - Heart rate · `goals` · radio · required
  - Rehab · `goals` · radio · required
  - Inch loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - strength training · `goals` · radio · required
  - Running · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - fat loss,muscle tune · `goals` · radio · required
  - strength and size gain · `goals` · radio · required
  - muscle gain, fat loss · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - muscle gain · `goals` · radio · required
  - fat loss , weight gain , mussscle build · `goals` · radio · required
  - marathon · `goals` · radio · required
  - marathon · `goals` · radio · required
  - Marathon · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Fat loss muscle gain · `goals` · radio · required
  - diabetic management · `goals` · radio · required
  - diabetic diet plan · `goals` · radio · required
  - Postural training · `goals` · radio · required
  - Awareness · `goals` · radio · required
  - increase bench press capacity · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Toning · `goals` · radio · required
  - Muscle gain & Fat loss · `goals` · radio · required
  - STRENGTHENING · `goals` · radio · required
  - MOBILITY & JOINT CONDITION · `goals` · radio · required
  - RELAX MUSCLE · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Power lifting · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - Kidney · `goals` · radio · required
  - Yoga Satvik Diet plan · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve Flexibility · `goals` · radio · required
  - Overall health and immunity · `goals` · radio · required
  - Injury rehabilitation · `goals` · radio · required
  - Build Body strength · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Diabetes · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Muscle Gain N Toning · `goals` · radio · required
  - Build Strength Endurance · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - peak week · `goals` · radio · required
  - TRANSFORMATION · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Building abs · `goals` · radio · required
  - foundation · `goals` · radio · required
  - Muscle building · `goals` · radio · required
  - self defense level 1 · `goals` · radio · required
  - FAT LOSS · `goals` · radio · required
  - Muscular Endurance and Stamina · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Building abs · `goals` · radio · required
  - acting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - general · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Overall Health Immunity and Fatloss · `goals` · radio · required
  - Overall Health and Lean Muscle Gain · `goals` · radio · required
  - fitness · `goals` · radio · required
  - Mental health · `goals` · radio · required
  - Detoxify the body · `goals` · radio · required
  - increase speed · `goals` · radio · required
  - Strength and stamina increase, Fatloss · `goals` · radio · required
  - weight gain · `goals` · radio · required
  - Fat Loss N Toning · `goals` · radio · required
  - Pain management · `goals` · radio · required
  - Improve muscular strength · `goals` · radio · required
  - Improve joint range of motion · `goals` · radio · required
  - home program · `goals` · radio · required
  - Pain Control · `goals` · radio · required
  - Improve Joint ROM · `goals` · radio · required
  - Improve Muscle Power · `goals` · radio · required
  - Improve Balance & Coordination · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Improve Breathing capacity · `goals` · radio · required
  - Improve ADL · `goals` · radio · required
  - Fat Loss · `goals` · radio · required
  - Calf moulding · `goals` · radio · required
  - lean muscle fatloss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - increase height · `goals` · radio · required
  - increase height · `goals` · radio · required
  - Recomposition · `goals` · radio · required
  - Wight loss & muscle gain · `goals` · radio · required
  - Body Conditioning · `goals` · radio · required
  - Transform · `goals` · radio · required
  - Get Started · `goals` · radio · required
  - Knee Pain Senior citizens · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - bb · `goals` · radio · required
  - Super Transformation · `goals` · radio · required
  - beginner · `goals` · radio · required
  - beginner · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - strength build-up & toning · `goals` · radio · required
  - for normal delivery · `goals` · radio · required
  - warm muscles and joints · `goals` · radio · required
  - Fat loss muscle building · `goals` · radio · required
  - Toning 1.1 ( Resistance Band) · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Lean Muscle & Toning · `goals` · radio · required
  - Fat Loss & Improve overall Health · `goals` · radio · required
  - Lean & Photoshoot Ready Physique · `goals` · radio · required
  - Strength Building & Improve HM Timing · `goals` · radio · required
  - Fat loss & Lean physique · `goals` · radio · required
  - Full body · `goals` · radio · required
  - Weight loss & toning · `goals` · radio · required
  - new · `goals` · radio · required
  - Diabetes Diet Plan · `goals` · radio · required
  - lunch capacity enhance · `goals` · radio · required
  - Weight Loss & Fat Loss · `goals` · radio · required
  - Build Strength · `goals` · radio · required
  - Fat Loss & Beach Ready · `goals` · radio · required
  - - · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Fat Loss · `goals` · radio · required
  - Weight Loss / Fat Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - WEIGHT LOSS · `goals` · radio · required
  - Weight Loss & General Fitness · `goals` · radio · required
  - Strength Building and Marathon Training · `goals` · radio · required
  - Strength Building and Train for Ultra 50K · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Fat Loss and Wellness · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - BODY RECOMPOSITION · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - massive gan · `goals` · radio · required
  - detoxification · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Increasing Power · `goals` · radio · required
  - Functional training · `goals` · radio · required
  - Daily Movement · `goals` · radio · required
  - Weight Lose · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Lean Mass · `goals` · radio · required
  - Warm Up · `goals` · radio · required
  - Lean Mass · `goals` · radio · required
  - Lean mass · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - healthy lifestyle · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Recomposition · `goals` · radio · required
  - Toning · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss and Muscle gain · `goals` · radio · required
  - Lean mass · `goals` · radio · required
  - Lower Body · `goals` · radio · required
  - ABS · `goals` · radio · required
  - increase stamina · `goals` · radio · required
  - get fit · `goals` · radio · required
  - Weight Loss 1.2K · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - HYPERTROPHY · `goals` · radio · required
  - 1st Prep · `goals` · radio · required
  - height gain · `goals` · radio · required
  - build muscle, increasing mobility and flexibility. · `goals` · radio · required
  - Warm Up · `goals` · radio · required
  - Recovery · `goals` · radio · required
  - Maintain fitness · `goals` · radio · required

Form 4:
- [button] x
- **Send Whatsapp Message**
- **[person]**
- **Message Body**
  - Enter a message that you want to send to customer. · `message_body` · textarea
- [button] Close
- [button] Send Message

Form 5:
- [button] x
- **Send Whatsapp Message**
- **[person]**
- **Message Body**
  - Enter a message that you want to send to customer. · `whatsapp_message_body` · textarea
- [button] Close
- [button] Send Message

Form 6:
- [button] x
- **[person]**
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - `renew_start_date` · text
- [button] Apply
- [button] Add more plan
  - [redacted] · `customer_email` · text · required
  - Enter Member Code · `couple_cust_id` · text
- **Select A Batch**
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- [button] Close
- [button] Add Subscription

Form 7:
- [button] x
- **[person]**
- **Membership Selection**
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - Select Membership · `searchboxpt` · text · required
  - Search... · `membership_plan-0` · text
  - [redacted] · `customer_email` · text · required
  - Select Trainer · `searchboxptt` · text · required
  - Search... · `trainer_trail_select-0` · text
  - `second_trainer_trail_select` · multiselect · options: {16 people/records}
  - `pt_points-0` · number · required · default 0
  - `pt_sessions-0` · number · required
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Yes · `devide_sessions_between_couple` · radio
  - No · `devide_sessions_between_couple` · radio
- **Make a Payment**
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code` · text
- [button] Apply Code
- **Select A Batch**
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- [button] Close
- [button] Add Subscription

Form 8:
- [button] x
- **Downgrade Subscription**
- **[person]**
- **Subscription Selection**
  - `downgrade_subscription` · select · required · options: Select Subscription
- **Downgrade to Membership**
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `membership_plan-0` · select · required · options: Please Select Subscription
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
- **Plan Price**
- **Previous Plan Paid Amount**
- **Refund Amount:**
- **Previous Plan Price:**
- **New Plan Price:**
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - Base Price · `downgrade_note` · text
- [button] Close
- [button] Downgrade Subscription

Form 9:
- [button] x
- **Freeze Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership* · `freeze_membership_plan` · select · required · options: Select Subscription
  - dd-mm-yyyy · `freeze_start_date` · text
  - `freeze_days` · number · required
- **Freeze Subscription Fees**
  - Base Price · `freeze_price` · text
  - Base Price · `freeze_note` · text
- [button] Close
- [button] Freeze Subscription

Form 10:
- [button] x
- **Extend Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership* · `extend_membership_plan` · select · required · options: Select Subscription
- **Your Extension starts from the next day of selected Subscription End date**
  - `extend_days` · number · required
- **Extension Subscription Fees**
  - Base Price · `extend_price` · text · required
  - Base Price · `extendsion_note` · text
- [button] Close
- [button] Extend Subscription

Form 11:
- [button] x
- **Transfer Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership* · `transfer_membership_plan` · select · required · options: Select Subscription
- **Transfer to**
  - Enter Member Code/Enquiry Code/Phone Number · `cust_id` · text · required
- **Joining Date**
  - `start_date` · text · required
  - End Date · `end_date` · text
- **Transfer Subscription Fees**
  - Base Price · `transfer_price` · text
- [button] Close
- [button] Transfer Subscription

Form 12:
- [button] x
- **Upgrade Subscription**
- **[person]**
- **Subscription Selection**
  - Select Subscription · `sub_upgrade_membership_plan` · select · required · options: Select Subscription you wish to upgrade
  - Check Group to add subscription · `has_couple_check` · checkbox
- **Upgrade to Membership**
  - `upgrade_membership_plan` · select · required · options: {24 people/records}
- **Joining Date**
  - Start Date · `upgrade_start_date` · text · required
  - End Date · `upgrade_end_date` · text · required
- **Plan Price**
  - Base Price · `base_price` · text
  - Subscription Paid Price · `id_subscription_paid_price` · text
  - Sales Price · `sales_price` · text · required
- **Coupon Code**
  - Coupon Code · `upgrade_coupon_code` · text
- [button] Apply
- [button] Close
- [button] Upgrade Subscription

Form 13:
- [button] x
- **Book a Trial**
- **[person]**
- **Membership Selection**
  - `membership_plan-0` · select · required · options: Select Membership, Free Trail - PT
  - `trainer_trail_select-0` · select · required · options: {17 people/records}
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `pt_sessions-0` · number · required
- **Make a Payment**
  - `plan_price-0` · text · required
- [button] Close
- [button] Add Subscription

Form 14:
- [button] x
- **Delete Member from device**
- **[person]**
- [button] Close
- [button] Delete Member to Device

Form 15:
- [button] x
- **Activate Member from device**
- **[person]**
- [button] Close
- [button] Activate Member to Device

Form 16:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- **Notice**
- [button] Close
- [button] Add Member & Fingerprint

Form 17:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- [button] Close
- [button] Add Member to Device
- [button] x
- **ADD CUSTOMER TO VITAL DEVICE**
- **[person]**
  - `device_list` · select · required · options: 
  - `device_ou_id` · select · required · options: 
- [button] Close
- [button] Add User To Vital Device

Form 18:
- [button] x
- **ADD CUSTOMER TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Add User To Biometric Device

Form 19:
- [button] x
- **UPDATE EXPIRY RULE FOR CUSTOMER (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `expiry_date` · text · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Update User Data To Biometric Device

Form 20:
- [button] x
- **ADD CUSTOMER TO REGISTER FACE IN DEVICE**
- **[person]**
  - Finger · `timmy_command_type` · radio · required
  - Face · `timmy_command_type` · radio
  - QR Code · `timmy_command_type` · radio
  - RFID Card · `timmy_command_type` · radio
  - `timmy_device_list` · select · required · options: Select Devices
- [button] Close
- [button] Add User To Fingerprint Device
- [button] x
- **[row value]**
- **... repeated once per row (7 rows on the page)**

Form 21:
- [button] x
- **ADD CUSTOMER TO REGISTER FACE IN DEVICE**
- **[person]**
  - `smart_office_serial_number` · select · required · options: Select Devices, None: Device
- [button] Close
- [button] Add User To SmartOffice Device
- [button] x
- **BLOCK CUSTOMER FACE IN DEVICE**
- **[person]**
  - `smart_office_serial_number_block` · select · required · options: Select Devices, None: Device
- [button] Close
- [button] Block User To SmartOffice Device

Form 22:
- [button] x
- **RE-ENROLL CUSTOMER TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Enroll User To Biometric Device

Form 23:
- [button] x
- **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Delete User From Device

Form 24:
- [button] x
- **SYNC CUSTOMER TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
- [button] Close
- [button] Sync User To Biometric Device

Form 25:
- [button] x
- **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Block User From Device

Form 26:
- [button] x
- **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Un-Block User From Device

Form 27:
- [button] x
- **Add Member to device Face**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- **Notice**
- [button] Close
- [button] Add Member & Face

Form 28:
- [button] x
- **Add Member to Etime Device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- **Notice**
- [button] Close
- [button] Add Fingerprint
- [button] x
- **Sync RFID to all you Gym Branches**
- [button] Close
- [button] Sync RFID

Form 29:
  - Add a photo · `center_logo` · file
- [button] x
- **Set Profile Picture**
- [button] Take Snapshot
- [button] Set As Profile Picture
- [button] Cancel
- [button] Open WebCam
- [button] Remove Photo
- **[person]**
- [button] Check in
- **Membership Actions**
- [button] Assign Personal Training
- [button] Book a free Trial
- [button] Add Subscription

Pop-up: **Send Notification** — buttons: Send Notification
  - Make sure your title is short and explanatory. · `noti_name` · text · required
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea · required

Pop-up: **Add Workout** — buttons: Create A Workout Plan, Assign Workout
  - Customer's Weight · `weight` · number · required
  - feet · `height_feet` · number · required
  - inch · `height_inch` · number · required
  - Fat Loss · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Weight Gain · `goals` · radio · required
  - General Fitness · `goals` · radio · required
  - Over all fitness · `goals` · radio · required
  - Sports Specific · `goals` · radio · required
  - Marathon Training · `goals` · radio · required
  - Lean Toning · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Strength building · `goals` · radio · required
  - Calisthenics · `goals` · radio · required
  - Stamina building · `goals` · radio · required
  - Maintain Weight · `goals` · radio · required
  - Sports specific purpose · `goals` · radio · required
  - Sports Specific Purpose · `goals` · radio · required
  - Active Rest Cardio · `goals` · radio · required
  - Deep Fasting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Maintain whole body · `goals` · radio · required
  - intense · `goals` · radio · required
  - body element · `goals` · radio · required
  - Body Toning · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Motivate to doing Workout · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Mental Health · `goals` · radio · required
  - begginer · `goals` · radio · required
  - basic course · `goals` · radio · required
  - Fat Loss + Testosterone Boost + T3 & T4 Improvement · `goals` · radio · required
  - immunity · `goals` · radio · required
  - home workout · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - Pain Management · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Improve posture · `goals` · radio · required
  - Body Tone · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Weight gain · `goals` · radio · required
  - Strength boosting · `goals` · radio · required
  - Stiff Shoulder · `goals` · radio · required
  - Increase football skills · `goals` · radio · required
  - yoga · `goals` · radio · required
  - Massage · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve strength · `goals` · radio · required
  - Muscle Endurance · `goals` · radio · required
  - strength · `goals` · radio · required
  - improve Muscle blood flow · `goals` · radio · required
  - Full Body Energizer · `goals` · radio · required
  - Sports specific · `goals` · radio · required
  - Performance · `goals` · radio · required
  - Shoulder Rehab · `goals` · radio · required
  - circuit training · `goals` · radio · required
  - Core conditioning · `goals` · radio · required
  - abc · `goals` · radio · required
  - Rehab Programme · `goals` · radio · required
  - Problem · `goals` · radio · required
  - fat loss · `goals` · radio · required
  - Back problem · `goals` · radio · required
  - demo · `goals` · radio · required
  - improve balance · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Improve time · `goals` · radio · required
  - Aerobic base · `goals` · radio · required
  - Heart rate · `goals` · radio · required
  - Rehab · `goals` · radio · required
  - Inch loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - strength training · `goals` · radio · required
  - Running · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - fat loss,muscle tune · `goals` · radio · required
  - strength and size gain · `goals` · radio · required
  - muscle gain, fat loss · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - muscle gain · `goals` · radio · required

Pop-up: **Send Whatsapp Message** — buttons: Send Message
  - Enter a message that you want to send to customer. · `message_body` · textarea

Pop-up: **SubscriptionModal** — buttons: Lookup Member code, Lookup Enquiry code, Add Subscription
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - `renew_start_date` · text
  - Select Membership · `searchbox` · text · required
  - Search... · `membership_plan-0` · text
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code-0` · text
  - [redacted] · `customer_email` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)

Pop-up: **SubscriptionModall** — buttons: Lookup Member code, Lookup Enquiry code, Add Subscription
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - Select Membership · `searchboxpt` · text · required
  - Search... · `membership_plan-0` · text
  - [redacted] · `customer_email` · text · required
  - Select Trainer · `searchboxptt` · text · required
  - Search... · `trainer_trail_select-0` · text
  - `second_trainer_trail_select` · multiselect · options: {16 people/records}
  - `pt_points-0` · number · required · default 0
  - `pt_sessions-0` · number · required
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Yes · `devide_sessions_between_couple` · radio
  - No · `devide_sessions_between_couple` · radio
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code` · text
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)

Pop-up: **Downgrade Subscription** — buttons: Downgrade Subscription
  - `downgrade_subscription` · select · required · options: Select Subscription
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `membership_plan-0` · select · required · options: Please Select Subscription
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - Base Price · `downgrade_note` · text

Pop-up: **Freeze Subscription** — buttons: Freeze Subscription
  - Select Membership* · `freeze_membership_plan` · select · required · options: Select Subscription
  - dd-mm-yyyy · `freeze_start_date` · text
  - `freeze_days` · number · required
  - Base Price · `freeze_price` · text
  - Base Price · `freeze_note` · text

Pop-up: **Extend Subscription** — buttons: Extend Subscription
  - Select Membership* · `extend_membership_plan` · select · required · options: Select Subscription
  - `extend_days` · number · required
  - Base Price · `extend_price` · text · required
  - Base Price · `extendsion_note` · text

Pop-up: **Transfer Subscription** — buttons: Lookup Member code, Lookup Enquiry code, Transfer Subscription
  - Select Membership* · `transfer_membership_plan` · select · required · options: Select Subscription
  - Enter Member Code/Enquiry Code/Phone Number · `cust_id` · text · required
  - `start_date` · text · required
  - End Date · `end_date` · text
  - Base Price · `transfer_price` · text

Pop-up: **Upgrade Subscription** — buttons: Apply, Upgrade Subscription
  - Select Subscription · `sub_upgrade_membership_plan` · select · required · options: Select Subscription you wish to upgrade
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `upgrade_membership_plan` · select · required · options: {24 people/records}
  - Start Date · `upgrade_start_date` · text · required
  - End Date · `upgrade_end_date` · text · required
  - Base Price · `base_price` · text
  - Subscription Paid Price · `id_subscription_paid_price` · text
  - Sales Price · `sales_price` · text · required
  - Coupon Code · `upgrade_coupon_code` · text

Pop-up: **Book a Trial** — buttons: Add Subscription
  - `membership_plan-0` · select · required · options: Select Membership, Free Trail - PT
  - `trainer_trail_select-0` · select · required · options: {17 people/records}
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `pt_sessions-0` · number · required
  - `plan_price-0` · text · required

Pop-up: **Delete Member from device** — buttons: Delete Member to Device

Pop-up: **Activate Member from device** — buttons: Activate Member to Device

Pop-up: **Add Member to device** — buttons: Add Member & Fingerprint
  - `essl_code` · number · required
  - `rfid` · number · default None

Pop-up: **ADD CUSTOMER TO VITAL DEVICE** — buttons: Add User To Vital Device
  - `device_list` · select · required · options: 
  - `device_ou_id` · select · required · options: 

Pop-up: **ADD CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Add User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **UPDATE EXPIRY RULE FOR CUSTOMER (NEW)** — buttons: Update User Data To Biometric Device
  - `biometric_code` · number · required
  - `expiry_date` · text · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **ADD CUSTOMER TO REGISTER FACE IN DEVICE** — buttons: Add User To Fingerprint Device
  - Finger · `timmy_command_type` · radio · required
  - Face · `timmy_command_type` · radio
  - QR Code · `timmy_command_type` · radio
  - RFID Card · `timmy_command_type` · radio
  - `timmy_device_list` · select · required · options: Select Devices

Pop-up: **ADD CUSTOMER TO HAPPY HOURS** — buttons: SAVE
  - `timmy_device_happy_hr_range` · select · options: --Select--, Remove From Happy Hour, Range 1 (10:00 AM to 4:00 PM)

Pop-up: **BLOCK/UNBLOCK CUSTOMER** — buttons: NO, YES

Pop-up: **ADD CUSTOMER TO REGISTER FINGER IN DEVICE** — buttons: Add User To ZKTeco Device
  - `auth_user_id` · text
  - `user_name` · text
  - Finger · `zk_command_type` · radio

Pop-up: **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Delete User From Device
  - `del_auth_user_id` · text
  - `del_user_name` · text

Pop-up: **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Un-Block User From Device
  - `ublock_auth_user_id` · text
  - `ublock_user_name` · text

Pop-up: **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Block User From Device
  - `block_auth_user_id` · text
  - `block_user_name` · text

Pop-up: **BLOCK CUSTOMER FACE IN DEVICE** — buttons: Block User To SmartOffice Device
  - `smart_office_serial_number_block` · select · required · options: Select Devices, None: Device

Pop-up: **RE-ENROLL CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Enroll User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Delete User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **SYNC CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Sync User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list[]` · checkbox · required

Pop-up: **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Block User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Un-Block User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **Add Member to device Face** — buttons: Add Member & Face
  - `essl_code` · number · required
  - `rfid` · number · default None

Pop-up: **Add Member to Etime Device** — buttons: Add Fingerprint
  - `essl_code` · number · required
  - `rfid` · number · default None

Pop-up: **Sync RFID to all you Gym Branches** — buttons: Sync RFID

Pop-up: **Set Profile Picture** — buttons: Set As Profile Picture, Cancel

Opens: `/fitness-center/customer/basic-information/Customer-{id}/` · `/fitness-center/customer/Customer-{id}/` · `/fitness-center/customer/subscriptions/Customer-{id}/0/` · `/fitness-center/customer/attendance/Customer-{id}/0/ ` · `/fitness-center/customer/workout/Customer-{id}/0/` · `/fitness-center/customer/folloup-history/Customer-{id}/0/` · `/fitness-center/customer/client-form/Customer-{id}/0/` · `/fitness-center/customer/Referral-by/Customer-{id}/0/ ` · `/merchant/fitness-center/customers/enquiry-form/Customer-{id}/` · `/ecommerce/add-order/Customer-{id}` · `/app-challenge/challenge-list/Customer/{id}/` · `/merchant/fitness-center/combo-offer-membership/Customer-{id}/`

### [person]

`/fitness-center/customer/Customer-{id}/`

Headings: [person] · Membership Actions · Medical History · Medical Details · . · Basic Information · Member Details · Emergency Contact Details · Additional Details · Member Address & Location · Address
Columns: # | Membership Plan | Start Date | End Date | Base Price | Selling Price | Apply Coupon | Action
Columns: Device Name, Type | Device Serial
Filter labels: × Membership has not been Assigned Yet! To close this enquiry assign a new membership. · Add a photo
Actions: Reset Password · Log Out · Open WebCam · Remove Photo · Check in · Send WhatsApp Message · Place Order · See Follow Up History · View Participated Challenges · Assign Personal Training · Book a free Trial · Add Subscription · Assign Combo Offer

Form 2:
- [button] x
- **Send Notification**
- **[person]**
- **Notification**
  - Make sure your title is short and explanatory. · `noti_name` · text · required
- **Notification Body**
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea · required
- [button] Close
- [button] Send Notification

Form 3:
- [button] x
- **Add Workout**
- **[person]**
- **Weight**
  - Customer's Weight · `weight` · number · required
- **Height**
  - feet · `height_feet` · number · required
  - inch · `height_inch` · number · required
- **Customer's Goal**
  - Fat Loss · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Weight Gain · `goals` · radio · required
  - General Fitness · `goals` · radio · required
  - Over all fitness · `goals` · radio · required
  - Sports Specific · `goals` · radio · required
  - Marathon Training · `goals` · radio · required
  - Lean Toning · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Strength building · `goals` · radio · required
  - Calisthenics · `goals` · radio · required
  - Stamina building · `goals` · radio · required
  - Maintain Weight · `goals` · radio · required
  - Sports specific purpose · `goals` · radio · required
  - Sports Specific Purpose · `goals` · radio · required
  - Active Rest Cardio · `goals` · radio · required
  - Deep Fasting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Maintain whole body · `goals` · radio · required
  - intense · `goals` · radio · required
  - body element · `goals` · radio · required
  - Body Toning · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Motivate to doing Workout · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Mental Health · `goals` · radio · required
  - begginer · `goals` · radio · required
  - basic course · `goals` · radio · required
  - Fat Loss + Testosterone Boost + T3 & T4 Improvement · `goals` · radio · required
  - immunity · `goals` · radio · required
  - home workout · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - Pain Management · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Improve posture · `goals` · radio · required
  - Body Tone · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Weight gain · `goals` · radio · required
  - Strength boosting · `goals` · radio · required
  - Stiff Shoulder · `goals` · radio · required
  - Increase football skills · `goals` · radio · required
  - yoga · `goals` · radio · required
  - Massage · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve strength · `goals` · radio · required
  - Muscle Endurance · `goals` · radio · required
  - strength · `goals` · radio · required
  - improve Muscle blood flow · `goals` · radio · required
  - Full Body Energizer · `goals` · radio · required
  - Sports specific · `goals` · radio · required
  - Performance · `goals` · radio · required
  - Shoulder Rehab · `goals` · radio · required
  - circuit training · `goals` · radio · required
  - Core conditioning · `goals` · radio · required
  - abc · `goals` · radio · required
  - Rehab Programme · `goals` · radio · required
  - Problem · `goals` · radio · required
  - fat loss · `goals` · radio · required
  - Back problem · `goals` · radio · required
  - demo · `goals` · radio · required
  - improve balance · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Improve time · `goals` · radio · required
  - Aerobic base · `goals` · radio · required
  - Heart rate · `goals` · radio · required
  - Rehab · `goals` · radio · required
  - Inch loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - strength training · `goals` · radio · required
  - Running · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - fat loss,muscle tune · `goals` · radio · required
  - strength and size gain · `goals` · radio · required
  - muscle gain, fat loss · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - muscle gain · `goals` · radio · required
  - fat loss , weight gain , mussscle build · `goals` · radio · required
  - marathon · `goals` · radio · required
  - marathon · `goals` · radio · required
  - Marathon · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Fat loss muscle gain · `goals` · radio · required
  - diabetic management · `goals` · radio · required
  - diabetic diet plan · `goals` · radio · required
  - Postural training · `goals` · radio · required
  - Awareness · `goals` · radio · required
  - increase bench press capacity · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Toning · `goals` · radio · required
  - Muscle gain & Fat loss · `goals` · radio · required
  - STRENGTHENING · `goals` · radio · required
  - MOBILITY & JOINT CONDITION · `goals` · radio · required
  - RELAX MUSCLE · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Power lifting · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - Kidney · `goals` · radio · required
  - Yoga Satvik Diet plan · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve Flexibility · `goals` · radio · required
  - Overall health and immunity · `goals` · radio · required
  - Injury rehabilitation · `goals` · radio · required
  - Build Body strength · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Diabetes · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Muscle Gain N Toning · `goals` · radio · required
  - Build Strength Endurance · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - peak week · `goals` · radio · required
  - TRANSFORMATION · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Building abs · `goals` · radio · required
  - foundation · `goals` · radio · required
  - Muscle building · `goals` · radio · required
  - self defense level 1 · `goals` · radio · required
  - FAT LOSS · `goals` · radio · required
  - Muscular Endurance and Stamina · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Building abs · `goals` · radio · required
  - acting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - general · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Overall Health Immunity and Fatloss · `goals` · radio · required
  - Overall Health and Lean Muscle Gain · `goals` · radio · required
  - fitness · `goals` · radio · required
  - Mental health · `goals` · radio · required
  - Detoxify the body · `goals` · radio · required
  - increase speed · `goals` · radio · required
  - Strength and stamina increase, Fatloss · `goals` · radio · required
  - weight gain · `goals` · radio · required
  - Fat Loss N Toning · `goals` · radio · required
  - Pain management · `goals` · radio · required
  - Improve muscular strength · `goals` · radio · required
  - Improve joint range of motion · `goals` · radio · required
  - home program · `goals` · radio · required
  - Pain Control · `goals` · radio · required
  - Improve Joint ROM · `goals` · radio · required
  - Improve Muscle Power · `goals` · radio · required
  - Improve Balance & Coordination · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Improve Breathing capacity · `goals` · radio · required
  - Improve ADL · `goals` · radio · required
  - Fat Loss · `goals` · radio · required
  - Calf moulding · `goals` · radio · required
  - lean muscle fatloss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - increase height · `goals` · radio · required
  - increase height · `goals` · radio · required
  - Recomposition · `goals` · radio · required
  - Wight loss & muscle gain · `goals` · radio · required
  - Body Conditioning · `goals` · radio · required
  - Transform · `goals` · radio · required
  - Get Started · `goals` · radio · required
  - Knee Pain Senior citizens · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - bb · `goals` · radio · required
  - Super Transformation · `goals` · radio · required
  - beginner · `goals` · radio · required
  - beginner · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - strength build-up & toning · `goals` · radio · required
  - for normal delivery · `goals` · radio · required
  - warm muscles and joints · `goals` · radio · required
  - Fat loss muscle building · `goals` · radio · required
  - Toning 1.1 ( Resistance Band) · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Lean Muscle & Toning · `goals` · radio · required
  - Fat Loss & Improve overall Health · `goals` · radio · required
  - Lean & Photoshoot Ready Physique · `goals` · radio · required
  - Strength Building & Improve HM Timing · `goals` · radio · required
  - Fat loss & Lean physique · `goals` · radio · required
  - Full body · `goals` · radio · required
  - Weight loss & toning · `goals` · radio · required
  - new · `goals` · radio · required
  - Diabetes Diet Plan · `goals` · radio · required
  - lunch capacity enhance · `goals` · radio · required
  - Weight Loss & Fat Loss · `goals` · radio · required
  - Build Strength · `goals` · radio · required
  - Fat Loss & Beach Ready · `goals` · radio · required
  - - · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Fat Loss · `goals` · radio · required
  - Weight Loss / Fat Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - WEIGHT LOSS · `goals` · radio · required
  - Weight Loss & General Fitness · `goals` · radio · required
  - Strength Building and Marathon Training · `goals` · radio · required
  - Strength Building and Train for Ultra 50K · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Fat Loss and Wellness · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - BODY RECOMPOSITION · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - massive gan · `goals` · radio · required
  - detoxification · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Increasing Power · `goals` · radio · required
  - Functional training · `goals` · radio · required
  - Daily Movement · `goals` · radio · required
  - Weight Lose · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Lean Mass · `goals` · radio · required
  - Warm Up · `goals` · radio · required
  - Lean Mass · `goals` · radio · required
  - Lean mass · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - healthy lifestyle · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Recomposition · `goals` · radio · required
  - Toning · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss and Muscle gain · `goals` · radio · required
  - Lean mass · `goals` · radio · required
  - Lower Body · `goals` · radio · required
  - ABS · `goals` · radio · required
  - increase stamina · `goals` · radio · required
  - get fit · `goals` · radio · required
  - Weight Loss 1.2K · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - HYPERTROPHY · `goals` · radio · required
  - 1st Prep · `goals` · radio · required
  - height gain · `goals` · radio · required
  - build muscle, increasing mobility and flexibility. · `goals` · radio · required
  - Warm Up · `goals` · radio · required
  - Recovery · `goals` · radio · required
  - Maintain fitness · `goals` · radio · required

Form 4:
- [button] x
- **Send Whatsapp Message**
- **[person]**
- **Message Body**
  - Enter a message that you want to send to customer. · `message_body` · textarea
- [button] Close
- [button] Send Message

Form 5:
- [button] x
- **Send Whatsapp Message**
- **[person]**
- **Message Body**
  - Enter a message that you want to send to customer. · `whatsapp_message_body` · textarea
- [button] Close
- [button] Send Message

Form 6:
- [button] x
- **[person]**
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - `renew_start_date` · text
- [button] Apply
- [button] Add more plan
  - [redacted] · `customer_email` · text · required
  - Enter Member Code · `couple_cust_id` · text
- **Select A Batch**
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- [button] Close
- [button] Add Subscription

Form 7:
- [button] x
- **Medical History**
- **[person]**
  - Yes · `heart_problem` · radio · required
  - No · `heart_problem` · radio · required
  - Yes · `diabetes` · radio · required
  - No · `diabetes` · radio · required
  - Yes · `chest_pain_while_exercise` · radio · required
  - No · `chest_pain_while_exercise` · radio · required
  - Yes · `feel_faint` · radio · required
  - No · `feel_faint` · radio · required
  - Yes · `back_pain_or_joints_pain` · radio · required
  - No · `back_pain_or_joints_pain` · radio · required
  - Yes · `asthma` · radio · required
  - No · `asthma` · radio · required
  - Yes · `medication` · radio · required
  - No · `medication` · radio · required
  - Yes · `any_surgery` · radio · required
  - No · `any_surgery` · radio · required
  - Yes · `any_reason_to_modify_exercise` · radio · required
  - No · `any_reason_to_modify_exercise` · radio · required
  - Yes · `pregnant` · radio · required
  - No · `pregnant` · radio · required
  - Yes · `allergies` · radio · required
  - No · `allergies` · radio · required
  - Yes · `medical_problem` · radio · required
  - No · `medical_problem` · radio · required
  - `medical_note` · textarea
- [button] Close
- [button] Save

Form 8:
- [button] x
- **Freeze Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `freeze_membership_plan` · select · required · options: Select Subscription
  - dd-mm-yyyy · `freeze_start_date` · text
  - `freeze_days` · number · required
- **Freeze Subscription Fees**
  - Freeze for Days · `freeze_price` · text
  - Freeze for Days · `freeze_note` · text
- [button] Close
- [button] Freeze Subscription

Form 9:
- [button] x
- **Extend Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `extend_membership_plan` · select · required · options: Select Subscription
- **Your Extension starts from the next day of selected Subscription End date**
  - `extend_days` · number · required
- **Extension Subscription Fees**
  - Freeze for Days · `extend_price` · text · required
  - Freeze for Days · `extendsion_note` · text
- [button] Close
- [button] Extend Subscription

Form 10:
- [button] x
- **Transfer Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `transfer_membership_plan` · select · required · options: Select Subscription
- **Transfer to**
  - Enter Member Code/Enquiry Code/Phone Number · `cust_id` · text · required
- **Joining Date**
  - `start_date` · text · required
  - End Date · `end_date` · text
- **Transfer Subscription Fees**
  - Freeze for Days · `transfer_price` · text
- [button] Close
- [button] Transfer Subscription

Form 11:
- [button] x
- **Upgrade Subscription**
- **[person]**
- **Subscription Selection**
  - Select Subscription · `sub_upgrade_membership_plan` · select · required · options: Select Subscription you wish to upgrade
  - Check Group to add subscription · `has_couple_check` · checkbox
- **Upgrade to Membership**
  - `upgrade_membership_plan` · select · required · options: {24 people/records}
- **Joining Date**
  - Start Date · `upgrade_start_date` · text · required
  - End Date · `upgrade_end_date` · text · required
- **Plan Price**
  - Base Price · `base_price` · text
  - Subscription Paid Price · `id_subscription_paid_price` · text
  - Sales Price · `sales_price` · text · required
- **Coupon Code**
  - Coupon Code · `upgrade_coupon_code` · text
- [button] Apply
- [button] Close
- [button] Upgrade Subscription

Form 12:
- [button] x
- **[person]**
- **Membership Selection**
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - Select Membership · `searchboxpt` · text · required
  - Search... · `membership_plan-0` · text
  - [redacted] · `customer_email` · text · required
  - Select Trainer · `searchboxptt` · text · required
  - Search... · `trainer_trail_select-0` · text
  - `second_trainer_trail_select` · multiselect · options: {8 people/records}
  - `pt_points-0` · number · required · default 0
  - `pt_sessions-0` · number · required
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Yes · `devide_sessions_between_couple` · radio
  - No · `devide_sessions_between_couple` · radio
- **Make a Payment**
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code` · text
- [button] Apply Code
- **Select A Batch**
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- [button] Close
- [button] Add Subscription

Form 13:
- [button] x
- **Downgrade Subscription**
- **[person]**
- **Subscription Selection**
  - `downgrade_subscription` · select · required · options: Select Subscription
- **Downgrade to Membership**
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `membership_plan-0` · select · required · options: Please Select Subscription
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
- **Plan Price**
- **Previous Plan Paid Amount**
- **Refund Amount:**
- **Previous Plan Price:**
- **New Plan Price:**
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - Freeze for Days · `downgrade_note` · text
- [button] Close
- [button] Downgrade Subscription

Form 14:
- [button] x
- **Book a Trial**
- **[person]**
- **Membership Selection**
  - `membership_plan-0` · select · required · options: Select Membership, Free Trail - PT
  - `trainer_trail_select-0` · select · required · options: {9 people/records}
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `pt_sessions-0` · number · required
- **Make a Payment**
  - `plan_price-0` · text · required
- [button] Close
- [button] Add Subscription

Form 15:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- [button] Close
- [button] Add Member to Device

Form 16:
- [button] x
- **ADD CUSTOMER TO VITAL DEVICE**
- **[person]**
  - `device_list` · select · required · options: 
  - `device_ou_id` · select · required · options: 
- [button] Close
- [button] Add User To Vital Device

Form 17:
- [button] x
- **ADD CUSTOMER TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Add User To Biometric Device

Form 18:
- [button] x
- **UPDATE EXPIRY RULE FOR CUSTOMER (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `expiry_date` · text · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Update User Data To Biometric Device

Form 19:
- [button] x
- **ADD CUSTOMER TO REGISTER FACE IN DEVICE**
- **[person]**
  - Finger · `timmy_command_type` · radio · required
  - Face · `timmy_command_type` · radio
  - QR Code · `timmy_command_type` · radio
  - RFID Card · `timmy_command_type` · radio
  - `timmy_device_list` · select · required · options: Select Devices
- [button] Close
- [button] Add User To Fingerprint Device
- [button] x
- **[row value]**
- **... repeated once per row (7 rows on the page)**

Form 20:
- [button] x
- **ADD CUSTOMER TO REGISTER FACE IN DEVICE**
- **[person]**
  - `smart_office_serial_number` · select · required · options: Select Devices, None: Device
- [button] Close
- [button] Add User To SmartOffice Device
- [button] x
- **BLOCK CUSTOMER FACE IN DEVICE**
- **[person]**
  - `smart_office_serial_number_block` · select · required · options: Select Devices, None: Device
- [button] Close
- [button] Block User To SmartOffice Device

Form 21:
- [button] x
- **RE-ENROLL CUSTOMER TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Enroll User To Biometric Device

Form 22:
- [button] x
- **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Delete User From Device

Form 23:
- [button] x
- **SYNC CUSTOMER TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
- [button] Close
- [button] Sync User To Biometric Device

Form 24:
- [button] x
- **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Block User From Device

Form 25:
- [button] x
- **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Un-Block User From Device

Form 26:
- [button] x
- **Delete Member from device**
- **[person]**
- [button] Close
- [button] Delete Member to Device

Form 27:
- [button] x
- **Activate Member from device**
- **[person]**
- [button] Close
- [button] Activate Member to Device

Form 28:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- **Notice**
- [button] Close
- [button] Add Member & Fingerprint

Form 29:
- [button] x
- **Add Member to device Face**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- **Notice**
- [button] Close
- [button] Add Member & Face

Form 30:
- [button] x
- **Add Member to Etime Device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- **Notice**
- [button] Close
- [button] Add Fingerprint
- [button] x
- **Sync RFID to all you Gym Branches**
- [button] Close
- [button] Sync RFID

Form 31:
  - Add a photo · `center_logo` · file
- [button] x
- **Set Profile Picture**
- [button] Take Snapshot
- [button] Set As Profile Picture
- [button] Cancel
- [button] Open WebCam
- [button] Remove Photo
- **[person]**
- [button] Check in
- **Membership Actions**
- [button] Assign Personal Training
- [button] Book a free Trial
- [button] Add Subscription
- **Medical History**
- **Medical Details**
- **.**
- **Basic Information**
- **Member Details**
- **Emergency Contact Details**
- **Additional Details**
- **Member Address & Location**
- **Address**

Pop-up: **Send Notification** — buttons: Send Notification
  - Make sure your title is short and explanatory. · `noti_name` · text · required
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea · required

Pop-up: **Add Workout** — buttons: Create A Workout Plan, Assign Workout
  - Customer's Weight · `weight` · number · required
  - feet · `height_feet` · number · required
  - inch · `height_inch` · number · required
  - Fat Loss · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Weight Gain · `goals` · radio · required
  - General Fitness · `goals` · radio · required
  - Over all fitness · `goals` · radio · required
  - Sports Specific · `goals` · radio · required
  - Marathon Training · `goals` · radio · required
  - Lean Toning · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Strength building · `goals` · radio · required
  - Calisthenics · `goals` · radio · required
  - Stamina building · `goals` · radio · required
  - Maintain Weight · `goals` · radio · required
  - Sports specific purpose · `goals` · radio · required
  - Sports Specific Purpose · `goals` · radio · required
  - Active Rest Cardio · `goals` · radio · required
  - Deep Fasting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Maintain whole body · `goals` · radio · required
  - intense · `goals` · radio · required
  - body element · `goals` · radio · required
  - Body Toning · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Motivate to doing Workout · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Mental Health · `goals` · radio · required
  - begginer · `goals` · radio · required
  - basic course · `goals` · radio · required
  - Fat Loss + Testosterone Boost + T3 & T4 Improvement · `goals` · radio · required
  - immunity · `goals` · radio · required
  - home workout · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - Pain Management · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Improve posture · `goals` · radio · required
  - Body Tone · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Weight gain · `goals` · radio · required
  - Strength boosting · `goals` · radio · required
  - Stiff Shoulder · `goals` · radio · required
  - Increase football skills · `goals` · radio · required
  - yoga · `goals` · radio · required
  - Massage · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve strength · `goals` · radio · required
  - Muscle Endurance · `goals` · radio · required
  - strength · `goals` · radio · required
  - improve Muscle blood flow · `goals` · radio · required
  - Full Body Energizer · `goals` · radio · required
  - Sports specific · `goals` · radio · required
  - Performance · `goals` · radio · required
  - Shoulder Rehab · `goals` · radio · required
  - circuit training · `goals` · radio · required
  - Core conditioning · `goals` · radio · required
  - abc · `goals` · radio · required
  - Rehab Programme · `goals` · radio · required
  - Problem · `goals` · radio · required
  - fat loss · `goals` · radio · required
  - Back problem · `goals` · radio · required
  - demo · `goals` · radio · required
  - improve balance · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Improve time · `goals` · radio · required
  - Aerobic base · `goals` · radio · required
  - Heart rate · `goals` · radio · required
  - Rehab · `goals` · radio · required
  - Inch loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - strength training · `goals` · radio · required
  - Running · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - fat loss,muscle tune · `goals` · radio · required
  - strength and size gain · `goals` · radio · required
  - muscle gain, fat loss · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - muscle gain · `goals` · radio · required

Pop-up: **Send Whatsapp Message** — buttons: Send Message
  - Enter a message that you want to send to customer. · `message_body` · textarea

Pop-up: **SubscriptionModal** — buttons: Lookup Member code, Lookup Enquiry code, Add Subscription
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - `renew_start_date` · text
  - Select Membership · `searchbox` · text · required
  - Search... · `membership_plan-0` · text
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code-0` · text
  - [redacted] · `customer_email` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)

Pop-up: **Medical History** — buttons: Save
  - Yes · `heart_problem` · radio · required
  - No · `heart_problem` · radio · required
  - Yes · `diabetes` · radio · required
  - No · `diabetes` · radio · required
  - Yes · `chest_pain_while_exercise` · radio · required
  - No · `chest_pain_while_exercise` · radio · required
  - Yes · `feel_faint` · radio · required
  - No · `feel_faint` · radio · required
  - Yes · `back_pain_or_joints_pain` · radio · required
  - No · `back_pain_or_joints_pain` · radio · required
  - Yes · `asthma` · radio · required
  - No · `asthma` · radio · required
  - Yes · `medication` · radio · required
  - No · `medication` · radio · required
  - Yes · `any_surgery` · radio · required
  - No · `any_surgery` · radio · required
  - Yes · `any_reason_to_modify_exercise` · radio · required
  - No · `any_reason_to_modify_exercise` · radio · required
  - Yes · `pregnant` · radio · required
  - No · `pregnant` · radio · required
  - Yes · `allergies` · radio · required
  - No · `allergies` · radio · required
  - Yes · `medical_problem` · radio · required
  - No · `medical_problem` · radio · required
  - `medical_note` · textarea

Pop-up: **Freeze Subscription** — buttons: Freeze Subscription
  - Select Membership · `freeze_membership_plan` · select · required · options: Select Subscription
  - dd-mm-yyyy · `freeze_start_date` · text
  - `freeze_days` · number · required
  - Freeze for Days · `freeze_price` · text
  - Freeze for Days · `freeze_note` · text

Pop-up: **Extend Subscription** — buttons: Extend Subscription
  - Select Membership · `extend_membership_plan` · select · required · options: Select Subscription
  - `extend_days` · number · required
  - Freeze for Days · `extend_price` · text · required
  - Freeze for Days · `extendsion_note` · text

Pop-up: **Transfer Subscription** — buttons: Lookup Member code, Lookup Enquiry code, Transfer Subscription
  - Select Membership · `transfer_membership_plan` · select · required · options: Select Subscription
  - Enter Member Code/Enquiry Code/Phone Number · `cust_id` · text · required
  - `start_date` · text · required
  - End Date · `end_date` · text
  - Freeze for Days · `transfer_price` · text

Pop-up: **Upgrade Subscription** — buttons: Apply, Upgrade Subscription
  - Select Subscription · `sub_upgrade_membership_plan` · select · required · options: Select Subscription you wish to upgrade
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `upgrade_membership_plan` · select · required · options: {24 people/records}
  - Start Date · `upgrade_start_date` · text · required
  - End Date · `upgrade_end_date` · text · required
  - Base Price · `base_price` · text
  - Subscription Paid Price · `id_subscription_paid_price` · text
  - Sales Price · `sales_price` · text · required
  - Coupon Code · `upgrade_coupon_code` · text

Pop-up: **SubscriptionModall** — buttons: Lookup Member code, Lookup Enquiry code, Add Subscription
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - Select Membership · `searchboxpt` · text · required
  - Search... · `membership_plan-0` · text
  - [redacted] · `customer_email` · text · required
  - Select Trainer · `searchboxptt` · text · required
  - Search... · `trainer_trail_select-0` · text
  - `second_trainer_trail_select` · multiselect · options: {8 people/records}
  - `pt_points-0` · number · required · default 0
  - `pt_sessions-0` · number · required
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Yes · `devide_sessions_between_couple` · radio
  - No · `devide_sessions_between_couple` · radio
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code` · text
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)

Pop-up: **Downgrade Subscription** — buttons: Downgrade Subscription
  - `downgrade_subscription` · select · required · options: Select Subscription
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `membership_plan-0` · select · required · options: Please Select Subscription
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - Freeze for Days · `downgrade_note` · text

Pop-up: **Book a Trial** — buttons: Add Subscription
  - `membership_plan-0` · select · required · options: Select Membership, Free Trail - PT
  - `trainer_trail_select-0` · select · required · options: {9 people/records}
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `pt_sessions-0` · number · required
  - `plan_price-0` · text · required

Pop-up: **Add Member to device** — buttons: Add Member to Device
  - `essl_code` · number · required
  - `rfid` · number · default None

Pop-up: **ADD CUSTOMER TO VITAL DEVICE** — buttons: Add User To Vital Device
  - `device_list` · select · required · options: 
  - `device_ou_id` · select · required · options: 

Pop-up: **ADD CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Add User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **UPDATE EXPIRY RULE FOR CUSTOMER (NEW)** — buttons: Update User Data To Biometric Device
  - `biometric_code` · number · required
  - `expiry_date` · text · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **ADD CUSTOMER TO REGISTER FACE IN DEVICE** — buttons: Add User To Fingerprint Device
  - Finger · `timmy_command_type` · radio · required
  - Face · `timmy_command_type` · radio
  - QR Code · `timmy_command_type` · radio
  - RFID Card · `timmy_command_type` · radio
  - `timmy_device_list` · select · required · options: Select Devices

Pop-up: **ADD CUSTOMER TO HAPPY HOURS** — buttons: SAVE
  - `timmy_device_happy_hr_range` · select · options: --Select--, Remove From Happy Hour, Range 1 (10:00 AM to 4:00 PM)

Pop-up: **BLOCK/UNBLOCK CUSTOMER** — buttons: NO, YES

Pop-up: **ADD CUSTOMER TO REGISTER FINGER IN DEVICE** — buttons: Add User To ZKTeco Device
  - `auth_user_id` · text
  - `user_name` · text
  - Finger · `zk_command_type` · radio

Pop-up: **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Delete User From Device
  - `del_auth_user_id` · text
  - `del_user_name` · text

Pop-up: **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Un-Block User From Device
  - `ublock_auth_user_id` · text
  - `ublock_user_name` · text

Pop-up: **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Block User From Device
  - `block_auth_user_id` · text
  - `block_user_name` · text

Pop-up: **BLOCK CUSTOMER FACE IN DEVICE** — buttons: Block User To SmartOffice Device
  - `smart_office_serial_number_block` · select · required · options: Select Devices, None: Device

Pop-up: **RE-ENROLL CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Enroll User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Delete User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **SYNC CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Sync User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list[]` · checkbox · required

Pop-up: **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Block User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Un-Block User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **Delete Member from device** — buttons: Delete Member to Device

Pop-up: **Activate Member from device** — buttons: Activate Member to Device

Pop-up: **Add Member to device Face** — buttons: Add Member & Face
  - `essl_code` · number · required
  - `rfid` · number · default None

Pop-up: **Add Member to Etime Device** — buttons: Add Fingerprint
  - `essl_code` · number · required
  - `rfid` · number · default None

Pop-up: **Sync RFID to all you Gym Branches** — buttons: Sync RFID

Pop-up: **Set Profile Picture** — buttons: Set As Profile Picture, Cancel

Opens: `/fitness-center/customer/basic-information/Customer-{id}/` · `/fitness-center/customer/Customer-{id}/` · `/fitness-center/customer/subscriptions/Customer-{id}/0/` · `/fitness-center/customer/attendance/Customer-{id}/0/ ` · `/fitness-center/customer/workout/Customer-{id}/0/` · `/fitness-center/customer/folloup-history/Customer-{id}/0/` · `/fitness-center/customer/client-form/Customer-{id}/0/` · `/fitness-center/customer/Referral-by/Customer-{id}/0/ ` · `/merchant/fitness-center/customers/enquiry-form/Customer-{id}/` · `/ecommerce/add-order/Customer-{id}` · `/app-challenge/challenge-list/Customer/{id}/` · `/merchant/fitness-center/combo-offer-membership/Customer-{id}/` · `/merchant/fitness-center/customers/enquiry-form/Customer-{id}/ ` · `/fitness-center/customer/basic-information/Customer-{id}/ `

### Enquiry Basic Information

`/merchant/fitness-center/customers/enquiry-form/Customer-{id}/`

Headings: Enquiry Basic Information · Interested Gym Services & Referral · Select A Batch · Emergency contact
Filter labels: Customer Name * · Customer Email · Mobile Number * · This mobile number is already registered with system. Click here to view client profile. · Alternate Mobile Number · Guardian Contact Mobile Number · Date of Birth · Enquiry Date * · Client Rep* · Gender * · Address · Customer Company Name · Customer GST Number · Aadhaar Number · PAN Number · Source Promotion * · Source Enquiry * · Primary Tag · Secondary Tag · Assign Trainer · Followup Stage · Remarks/Summary · Referral by · Member Id · Third Party Referral Name · Employment Status · Occupation · Interested In · Batch · Hold down "Control", or "Command" on a Mac, to select more than one. · City · State · Country · Pincode · Guardian Contact Name · Guardian Contact Email · Relation with Guardian
Actions: Reset Password · Log Out · Lookup Member code · Lookup Enquiry code · Show Optional Fields · Back · Save & Close · Save

Form 2:
  - First name · `customer_first_name` · text · required
  - Last name · `customer_last_name` · text
  - [redacted] · `email` · text
  - `country_code` · text
  - [redacted] · `mobileNo` · text · required
  - Customer reluctant to give Mobile Number. · `add_alternate` · checkbox
  - `alt_country_code` · text
  - [redacted] · `alternate_mobileNo` · text
  - [redacted] · `em_mobileNo` · text
  - `dob` · text
  - `enquiry_date` · text
  - `created_by` · select · options: {6 people/records}
  - Male · `gender` · radio · required
  - Female · `gender` · radio · required
  - Other · `gender` · radio · required
  - Flat No.,Building name · `street1` · text
  - Street, Area · `street2` · text
  - `company_name` · text
  - `cust_gst_no` · text
  - e.g. 3675 9834 6012 · `aadhar` · number
  - Enter Pan Number · `pan_card` · text
  - Source Promotion * · `source_promo` · select · required · options: Unknown, Exterior Sign, Media Article, Television, Promotions, Other, Lead by APP, Google Ads, Facebook, Instagram, Word Of Mouth, Banner, Walk In, Member Referral, Poster, SMS, Website, Flyers, Hoarding, Just Dial, WhatsApp Marketing, Reseller, Facebook Messenger, Outbound, Country Club … (+21)
  - Source Enquiry * · `source_enquiry` · select · required · options: Unknown, Lead from Facebook, Call, Whatsapp, POS Referral, Member Referral, Walk In
  - Primary Tag · `primary_tag` · select · options: Select Primary Tag
  - Primary Tag · `secondary_tag` · select · options: Select Secondary Tag
  - `assign_trainer_select` · select · options: {9 people/records}
  - `fol_stage` · select · options: Tapped, Untapped
  - `customer_notes` · textarea
  - `trainer_select` · select · options: {15 people/records}
  - Enter Member Code · `cust_id` · text
  - Write Third Party Referral Name · `cust_outside_referal` · text
- [button] Show Optional Fields
  - Followup Stage · `emp_status` · select · options: Unknown, STUDENT, WORKING, NOT WORKING, SELF EMPLOYED, HOUSE WIFE
  - `occupation_name` · text
- **Interested Gym Services & Referral**
  - Weight Training · `fitness_category` · checkbox
  - Cardio · `fitness_category` · checkbox
  - Cross-fit · `fitness_category` · checkbox
  - Personal Training / Nutrition · `fitness_category` · checkbox
  - Calisthenics · `fitness_category` · checkbox
  - HIIT · `fitness_category` · checkbox
  - Strength Training · `fitness_category` · checkbox
  - Group Activity · `fitness_category` · checkbox
  - Nutrition · `fitness_category` · checkbox
  - Steam · `fitness_category` · checkbox
  - Locker · `fitness_category` · checkbox
  - Free Body Weight · `fitness_category` · checkbox
- **Select A Batch**
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
  - `city` · text
  - `state` · text
  - `country` · text
  - `pincode` · text
- **Emergency contact**
  - First name · `em_first_name` · text
  - Last name · `em_last_name` · text
  - [redacted] · `em_email` · text
  - `relationship` · text
- [button] Back
- [button] Save & Close
- [button] Save

### Member Information

`/fitness-center/customer/basic-information/Customer-{id}/`

Headings: Member Information · Member Status · New Enquiry · Referral · Select A Batch · Customer Address · Emergency contact
Filter labels: Member Name * · Member Email · Mobile Number * · Alternate Mobile Number · Date of Birth · Enquiry Date * · Client Rep* · Gender * · Reference Number · Aadhaar Number · PAN Number · Customer GST Number · Customer Company Name · Assign Trainer · Member Status* · Remarks/Summary · Referral by* · Member Id · Third Party Referral Name · Source Promotion · Primary Tag · Secondary Tag · Employment Status · Batch · Hold down "Control", or "Command" on a Mac, to select more than one. · Address · City · State · Country · Pincode · Guardian Contact Name · Guardian Contact Email · Guardian Contact Mobile Number · Relation with Guardian
Actions: Reset Password · Log Out · Lookup Member code · Lookup Enquiry code · Back · Save & Close · Save

Form 2:
  - First name · `customer_first_name` · text · required
  - Last name · `customer_last_name` · text
  - [redacted] · `email` · text
  - `country_code` · text
  - [redacted] · `mobileNo` · text · required
  - Customer reluctant to give Mobile Number. · `add_alternate` · checkbox
  - `alt_country_code` · text
  - [redacted] · `alternate_mobileNo` · text
  - `dob` · text
  - `enquiry_date` · text
  - `created_by` · select · options: {6 people/records}
  - Male · `gender` · radio · required
  - Female · `gender` · radio · required
  - Other · `gender` · radio · required
  - `ref_no` · text
  - e.g. 3675 9834 6012 · `aadhar` · number
  - Enter Pan Number · `pan_card` · text
  - `cust_gst_no` · text
  - `company_name` · text
  - `assign_trainer_select` · select · options: {17 people/records}
- **Member Status**
- **New Enquiry**
  - `customer_notes` · textarea
- **Referral**
  - `trainer_select` · select · options: {23 people/records}
  - Enter Member Code · `cust_id` · text
  - Write Third Party Referral Name · `cust_outside_referal` · text
  - Source Promotion · `source_promo` · select · options: Unknown, Google Ads, Facebook, Instagram, Word Of Mouth, Banner, Walk In, Passing By, Member Referral, Poster, SMS, Website, Flyers, Hoarding, Country Club, Message, Phone, Other, Just Dial, Hotel Guest, Database 1, Database 2, Database 3, Database 4, Database 5 … (+13)
  - Primary Tag · `primary_tag` · select · options: Select Primary Tag
  - Primary Tag · `secondary_tag` · select · options: Select Secondary Tag
  - Employment Status · `emp_status` · select · options: Unknown, STUDENT, WORKING, NOT WORKING, SELF EMPLOYED, HOUSE WIFE
- **Select A Batch**
  - Batch · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- **Customer Address**
  - Flat No., Building name · `street1` · text
  - Street, Area · `street2` · text
  - `city` · text
  - `state` · text
  - `country` · text
  - `pincode` · text
- **Emergency contact**
  - First name · `em_first_name` · text
  - Last name · `em_last_name` · text
  - [redacted] · `em_email` · text
  - [redacted] · `em_mobileNo` · number
  - `relationship` · text
- [button] Back
- [button] Save & Close
- [button] Save

### Medical History

`/fitness-center/customer/folloup-history/Customer-{id}/`

Headings: Medical History · Medical Details · . · Basic Information · Member Details · Emergency Contact Details · Additional Details · Member Address & Location · Address
Columns: # | Membership Plan | Start Date | End Date | Base Price | Selling Price | Apply Coupon | Action
Columns: Device Name, Type | Device Serial
Filter labels: × Membership has not been Assigned Yet! To close this enquiry assign a new membership.
Actions: Reset Password · Log Out

Form 2:
- [button] x
- **Send Notification**
- **Notification**
  - Make sure your title is short and explanatory. · `noti_name` · text · required
- **Notification Body**
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea · required
- [button] Close
- [button] Send Notification

Form 3:
- [button] x
- **Add Workout**
- **Weight**
  - Customer's Weight · `weight` · number · required
- **Height**
  - feet · `height_feet` · number · required
  - inch · `height_inch` · number · required
- **Customer's Goal**
  - Fat Loss · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Weight Gain · `goals` · radio · required
  - General Fitness · `goals` · radio · required
  - Over all fitness · `goals` · radio · required
  - Sports Specific · `goals` · radio · required
  - Marathon Training · `goals` · radio · required
  - Lean Toning · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Strength building · `goals` · radio · required
  - Calisthenics · `goals` · radio · required
  - Stamina building · `goals` · radio · required
  - Maintain Weight · `goals` · radio · required
  - Sports specific purpose · `goals` · radio · required
  - Sports Specific Purpose · `goals` · radio · required
  - Active Rest Cardio · `goals` · radio · required
  - Deep Fasting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Maintain whole body · `goals` · radio · required
  - intense · `goals` · radio · required
  - body element · `goals` · radio · required
  - Body Toning · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Motivate to doing Workout · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Mental Health · `goals` · radio · required
  - begginer · `goals` · radio · required
  - basic course · `goals` · radio · required
  - Fat Loss + Testosterone Boost + T3 & T4 Improvement · `goals` · radio · required
  - immunity · `goals` · radio · required
  - home workout · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - Pain Management · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Improve posture · `goals` · radio · required
  - Body Tone · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Weight gain · `goals` · radio · required
  - Strength boosting · `goals` · radio · required
  - Stiff Shoulder · `goals` · radio · required
  - Increase football skills · `goals` · radio · required
  - yoga · `goals` · radio · required
  - Massage · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve strength · `goals` · radio · required
  - Muscle Endurance · `goals` · radio · required
  - strength · `goals` · radio · required
  - improve Muscle blood flow · `goals` · radio · required
  - Full Body Energizer · `goals` · radio · required
  - Sports specific · `goals` · radio · required
  - Performance · `goals` · radio · required
  - Shoulder Rehab · `goals` · radio · required
  - circuit training · `goals` · radio · required
  - Core conditioning · `goals` · radio · required
  - abc · `goals` · radio · required
  - Rehab Programme · `goals` · radio · required
  - Problem · `goals` · radio · required
  - fat loss · `goals` · radio · required
  - Back problem · `goals` · radio · required
  - demo · `goals` · radio · required
  - improve balance · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Improve time · `goals` · radio · required
  - Aerobic base · `goals` · radio · required
  - Heart rate · `goals` · radio · required
  - Rehab · `goals` · radio · required
  - Inch loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - strength training · `goals` · radio · required
  - Running · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - fat loss,muscle tune · `goals` · radio · required
  - strength and size gain · `goals` · radio · required
  - muscle gain, fat loss · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - muscle gain · `goals` · radio · required
  - fat loss , weight gain , mussscle build · `goals` · radio · required
  - marathon · `goals` · radio · required
  - marathon · `goals` · radio · required
  - Marathon · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Fat loss muscle gain · `goals` · radio · required
  - diabetic management · `goals` · radio · required
  - diabetic diet plan · `goals` · radio · required
  - Postural training · `goals` · radio · required
  - Awareness · `goals` · radio · required
  - increase bench press capacity · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Toning · `goals` · radio · required
  - Muscle gain & Fat loss · `goals` · radio · required
  - STRENGTHENING · `goals` · radio · required
  - MOBILITY & JOINT CONDITION · `goals` · radio · required
  - RELAX MUSCLE · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Power lifting · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - Kidney · `goals` · radio · required
  - Yoga Satvik Diet plan · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve Flexibility · `goals` · radio · required
  - Overall health and immunity · `goals` · radio · required
  - Injury rehabilitation · `goals` · radio · required
  - Build Body strength · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Diabetes · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Muscle Gain N Toning · `goals` · radio · required
  - Build Strength Endurance · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - peak week · `goals` · radio · required
  - TRANSFORMATION · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Building abs · `goals` · radio · required
  - foundation · `goals` · radio · required
  - Muscle building · `goals` · radio · required
  - self defense level 1 · `goals` · radio · required
  - FAT LOSS · `goals` · radio · required
  - Muscular Endurance and Stamina · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Building abs · `goals` · radio · required
  - acting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - general · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Overall Health Immunity and Fatloss · `goals` · radio · required
  - Overall Health and Lean Muscle Gain · `goals` · radio · required
  - fitness · `goals` · radio · required
  - Mental health · `goals` · radio · required
  - Detoxify the body · `goals` · radio · required
  - increase speed · `goals` · radio · required
  - Strength and stamina increase, Fatloss · `goals` · radio · required
  - weight gain · `goals` · radio · required
  - Fat Loss N Toning · `goals` · radio · required
  - Pain management · `goals` · radio · required
  - Improve muscular strength · `goals` · radio · required
  - Improve joint range of motion · `goals` · radio · required
  - home program · `goals` · radio · required
  - Pain Control · `goals` · radio · required
  - Improve Joint ROM · `goals` · radio · required
  - Improve Muscle Power · `goals` · radio · required
  - Improve Balance & Coordination · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Improve Breathing capacity · `goals` · radio · required
  - Improve ADL · `goals` · radio · required
  - Fat Loss · `goals` · radio · required
  - Calf moulding · `goals` · radio · required
  - lean muscle fatloss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - increase height · `goals` · radio · required
  - increase height · `goals` · radio · required
  - Recomposition · `goals` · radio · required
  - Wight loss & muscle gain · `goals` · radio · required
  - Body Conditioning · `goals` · radio · required
  - Transform · `goals` · radio · required
  - Get Started · `goals` · radio · required
  - Knee Pain Senior citizens · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - bb · `goals` · radio · required
  - Super Transformation · `goals` · radio · required
  - beginner · `goals` · radio · required
  - beginner · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - strength build-up & toning · `goals` · radio · required
  - for normal delivery · `goals` · radio · required
  - warm muscles and joints · `goals` · radio · required
  - Fat loss muscle building · `goals` · radio · required
  - Toning 1.1 ( Resistance Band) · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Lean Muscle & Toning · `goals` · radio · required
  - Fat Loss & Improve overall Health · `goals` · radio · required
  - Lean & Photoshoot Ready Physique · `goals` · radio · required
  - Strength Building & Improve HM Timing · `goals` · radio · required
  - Fat loss & Lean physique · `goals` · radio · required
  - Full body · `goals` · radio · required
  - Weight loss & toning · `goals` · radio · required
  - new · `goals` · radio · required
  - Diabetes Diet Plan · `goals` · radio · required
  - lunch capacity enhance · `goals` · radio · required
  - Weight Loss & Fat Loss · `goals` · radio · required
  - Build Strength · `goals` · radio · required
  - Fat Loss & Beach Ready · `goals` · radio · required
  - - · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Fat Loss · `goals` · radio · required
  - Weight Loss / Fat Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - WEIGHT LOSS · `goals` · radio · required
  - Weight Loss & General Fitness · `goals` · radio · required
  - Strength Building and Marathon Training · `goals` · radio · required
  - Strength Building and Train for Ultra 50K · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Fat Loss and Wellness · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - BODY RECOMPOSITION · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - massive gan · `goals` · radio · required
  - detoxification · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Increasing Power · `goals` · radio · required
  - Functional training · `goals` · radio · required
  - Daily Movement · `goals` · radio · required
  - Weight Lose · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Lean Mass · `goals` · radio · required
  - Warm Up · `goals` · radio · required
  - Lean Mass · `goals` · radio · required
  - Lean mass · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - healthy lifestyle · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Recomposition · `goals` · radio · required
  - Toning · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss and Muscle gain · `goals` · radio · required
  - Lean mass · `goals` · radio · required
  - Lower Body · `goals` · radio · required
  - ABS · `goals` · radio · required
  - increase stamina · `goals` · radio · required
  - get fit · `goals` · radio · required
  - Weight Loss 1.2K · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - HYPERTROPHY · `goals` · radio · required
  - 1st Prep · `goals` · radio · required
  - height gain · `goals` · radio · required
  - build muscle, increasing mobility and flexibility. · `goals` · radio · required
  - Warm Up · `goals` · radio · required
  - Recovery · `goals` · radio · required
  - Maintain fitness · `goals` · radio · required
  - maintain fitness · `goals` · radio · required

Form 4:
- [button] x
- **Send Whatsapp Message**
- **Message Body**
  - Enter a message that you want to send to customer. · `message_body` · textarea
- [button] Close
- [button] Send Message

Form 5:
- [button] x
- **Send Whatsapp Message**
- **Message Body**
  - Enter a message that you want to send to customer. · `whatsapp_message_body` · textarea
- [button] Close
- [button] Send Message

Form 6:
- [button] x
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - `renew_start_date` · text
- [button] Apply
- [button] Add more plan
  - [redacted] · `customer_email` · text · required
  - Enter Member Code · `couple_cust_id` · text
- **Select A Batch**
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- [button] Close
- [button] Add Subscription

Form 7:
- [button] x
- **Medical History**
  - Yes · `heart_problem` · radio · required
  - No · `heart_problem` · radio · required
  - Yes · `diabetes` · radio · required
  - No · `diabetes` · radio · required
  - Yes · `chest_pain_while_exercise` · radio · required
  - No · `chest_pain_while_exercise` · radio · required
  - Yes · `feel_faint` · radio · required
  - No · `feel_faint` · radio · required
  - Yes · `back_pain_or_joints_pain` · radio · required
  - No · `back_pain_or_joints_pain` · radio · required
  - Yes · `asthma` · radio · required
  - No · `asthma` · radio · required
  - Yes · `medication` · radio · required
  - No · `medication` · radio · required
  - Yes · `any_surgery` · radio · required
  - No · `any_surgery` · radio · required
  - Yes · `any_reason_to_modify_exercise` · radio · required
  - No · `any_reason_to_modify_exercise` · radio · required
  - Yes · `pregnant` · radio · required
  - No · `pregnant` · radio · required
  - Yes · `allergies` · radio · required
  - No · `allergies` · radio · required
  - Yes · `medical_problem` · radio · required
  - No · `medical_problem` · radio · required
  - `medical_note` · textarea
- [button] Close
- [button] Save

Form 8:
- [button] x
- **Freeze Subscription**
- **Subscription Selection**
  - Select Membership · `freeze_membership_plan` · select · required · options: Select Subscription
  - dd-mm-yyyy · `freeze_start_date` · text
  - `freeze_days` · number · required
- **Freeze Subscription Fees**
  - Freeze for Days · `freeze_price` · text
  - Freeze for Days · `freeze_note` · text
- [button] Close
- [button] Freeze Subscription

Form 9:
- [button] x
- **Extend Subscription**
- **Subscription Selection**
  - Select Membership · `extend_membership_plan` · select · required · options: Select Subscription
- **Your Extension starts from the next day of selected Subscription End date**
  - `extend_days` · number · required
- **Extension Subscription Fees**
  - Freeze for Days · `extend_price` · text · required
  - Freeze for Days · `extendsion_note` · text
- [button] Close
- [button] Extend Subscription

Form 10:
- [button] x
- **Transfer Subscription**
- **Subscription Selection**
  - Select Membership · `transfer_membership_plan` · select · required · options: Select Subscription
- **Transfer to**
  - Enter Member Code/Enquiry Code/Phone Number · `cust_id` · text · required
- **Joining Date**
  - `start_date` · text · required
  - End Date · `end_date` · text
- **Transfer Subscription Fees**
  - Freeze for Days · `transfer_price` · text
- [button] Close
- [button] Transfer Subscription

Form 11:
- [button] x
- **Upgrade Subscription**
- **Subscription Selection**
  - Select Subscription · `sub_upgrade_membership_plan` · select · required · options: Select Subscription you wish to upgrade
  - Check Group to add subscription · `has_couple_check` · checkbox
- **Upgrade to Membership**
  - `upgrade_membership_plan` · select · required · options: {24 people/records}
- **Joining Date**
  - Start Date · `upgrade_start_date` · text · required
  - End Date · `upgrade_end_date` · text · required
- **Plan Price**
  - Base Price · `base_price` · text
  - Subscription Paid Price · `id_subscription_paid_price` · text
  - Sales Price · `sales_price` · text · required
- **Coupon Code**
  - Coupon Code · `upgrade_coupon_code` · text
- [button] Apply
- [button] Close
- [button] Upgrade Subscription

Form 12:
- [button] x
- **Membership Selection**
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - Select Membership · `searchboxpt` · text · required
  - Search... · `membership_plan-0` · text
  - [redacted] · `customer_email` · text · required
  - Select Trainer · `searchboxptt` · text · required
  - Search... · `trainer_trail_select-0` · text
  - `second_trainer_trail_select` · multiselect · options: {8 people/records}
  - `pt_points-0` · number · required · default 0
  - `pt_sessions-0` · number · required
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Yes · `devide_sessions_between_couple` · radio
  - No · `devide_sessions_between_couple` · radio
- **Make a Payment**
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code` · text
- [button] Apply Code
- **Select A Batch**
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- [button] Close
- [button] Add Subscription

Form 13:
- [button] x
- **Downgrade Subscription**
- **Subscription Selection**
  - `downgrade_subscription` · select · required · options: Select Subscription
- **Downgrade to Membership**
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `membership_plan-0` · select · required · options: Please Select Subscription
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
- **Plan Price**
- **Previous Plan Paid Amount**
- **Refund Amount:**
- **Previous Plan Price:**
- **New Plan Price:**
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - Freeze for Days · `downgrade_note` · text
- [button] Close
- [button] Downgrade Subscription

Form 14:
- [button] x
- **Book a Trial**
- **Membership Selection**
  - `membership_plan-0` · select · required · options: Select Membership, Free Trail - PT
  - `trainer_trail_select-0` · select · required · options: {9 people/records}
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `pt_sessions-0` · number · required
- **Make a Payment**
  - `plan_price-0` · text · required
- [button] Close
- [button] Add Subscription

Form 15:
- [button] x
- **Add Member to device**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number
- [button] Close
- [button] Add Member to Device

Form 16:
- [button] x
- **ADD CUSTOMER TO VITAL DEVICE**
  - `device_list` · select · required · options: 
  - `device_ou_id` · select · required · options: 
- [button] Close
- [button] Add User To Vital Device

Form 17:
- [button] x
- **ADD CUSTOMER TO BIOMETRIC DEVICE (NEW)**
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices
- [button] Close
- [button] Add User To Biometric Device

Form 18:
- [button] x
- **UPDATE EXPIRY RULE FOR CUSTOMER (NEW)**
  - `biometric_code` · number · required
  - `expiry_date` · text · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices
- [button] Close
- [button] Update User Data To Biometric Device

Form 19:
- [button] x
- **ADD CUSTOMER TO REGISTER FACE IN DEVICE**
  - Finger · `timmy_command_type` · radio · required
  - Face · `timmy_command_type` · radio
  - QR Code · `timmy_command_type` · radio
  - RFID Card · `timmy_command_type` · radio
  - `timmy_device_list` · select · required · options: Select Devices
- [button] Close
- [button] Add User To Fingerprint Device
- [button] x
- **ADD CUSTOMER TO HAPPY HOURS**
  - `timmy_device_happy_hr_range` · select · options: --Select--, Remove From Happy Hour, Range 1 (10:00 AM to 4:00 PM)
- [button] Close
- [button] SAVE
- [button] x
- **BLOCK/UNBLOCK CUSTOMER**
- [button] NO
- [button] YES
- [button] x
- **ADD CUSTOMER TO REGISTER FINGER IN DEVICE**
  - `auth_user_id` · text
  - `user_name` · text
  - Finger · `zk_command_type` · radio
- [button] Close
- [button] Add User To ZKTeco Device
- [button] x
- **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW).**
  - `del_auth_user_id` · text
  - `del_user_name` · text
- [button] Close
- [button] Delete User From Device
- [button] x
- **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW).**
  - `ublock_auth_user_id` · text
  - `ublock_user_name` · text
- [button] Close
- [button] Un-Block User From Device
- [button] x
- **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW).**
  - `block_auth_user_id` · text
  - `block_user_name` · text
- [button] Close
- [button] Block User From Device

Form 20:
- [button] x
- **ADD CUSTOMER TO REGISTER FACE IN DEVICE**
  - `smart_office_serial_number` · select · required · options: Select Devices, None: Device
- [button] Close
- [button] Add User To SmartOffice Device
- [button] x
- **BLOCK CUSTOMER FACE IN DEVICE**
  - `smart_office_serial_number_block` · select · required · options: Select Devices, None: Device
- [button] Close
- [button] Block User To SmartOffice Device

Form 21:
- [button] x
- **RE-ENROLL CUSTOMER TO BIOMETRIC DEVICE (NEW)**
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices
- [button] Close
- [button] Enroll User To Biometric Device

Form 22:
- [button] x
- **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
  - `device_list` · select · required · options: Select Devices
- [button] Close
- [button] Delete User From Device

Form 23:
- [button] x
- **SYNC CUSTOMER TO BIOMETRIC DEVICE (NEW)**
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
- [button] Close
- [button] Sync User To Biometric Device

Form 24:
- [button] x
- **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
  - `device_list` · select · required · options: Select Devices
- [button] Close
- [button] Block User From Device

Form 25:
- [button] x
- **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
  - `device_list` · select · required · options: Select Devices
- [button] Close
- [button] Un-Block User From Device

Form 26:
- [button] x
- **Delete Member from device**
- [button] Close
- [button] Delete Member to Device

Form 27:
- [button] x
- **Activate Member from device**
- [button] Close
- [button] Activate Member to Device

Form 28:
- [button] x
- **Add Member to device**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number
- **Notice**
- [button] Close
- [button] Add Member & Fingerprint

Form 29:
- [button] x
- **Add Member to device Face**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number
- **Notice**
- [button] Close
- [button] Add Member & Face

Form 30:
- [button] x
- **Add Member to Etime Device**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number
- **Notice**
- [button] Close
- [button] Add Fingerprint
- [button] x
- **Sync RFID to all you Gym Branches**
- [button] Close
- [button] Sync RFID

Form 31:
- **Medical History**
- **Medical Details**
- **.**
- **Basic Information**
- **Member Details**
- **Emergency Contact Details**
- **Additional Details**
- **Member Address & Location**
- **Address**

Pop-up: **Send Notification** — buttons: Send Notification
  - Make sure your title is short and explanatory. · `noti_name` · text · required
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea · required

Pop-up: **Add Workout** — buttons: Create A Workout Plan, Assign Workout
  - Customer's Weight · `weight` · number · required
  - feet · `height_feet` · number · required
  - inch · `height_inch` · number · required
  - Fat Loss · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Weight Gain · `goals` · radio · required
  - General Fitness · `goals` · radio · required
  - Over all fitness · `goals` · radio · required
  - Sports Specific · `goals` · radio · required
  - Marathon Training · `goals` · radio · required
  - Lean Toning · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Strength building · `goals` · radio · required
  - Calisthenics · `goals` · radio · required
  - Stamina building · `goals` · radio · required
  - Maintain Weight · `goals` · radio · required
  - Sports specific purpose · `goals` · radio · required
  - Sports Specific Purpose · `goals` · radio · required
  - Active Rest Cardio · `goals` · radio · required
  - Deep Fasting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Maintain whole body · `goals` · radio · required
  - intense · `goals` · radio · required
  - body element · `goals` · radio · required
  - Body Toning · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Motivate to doing Workout · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Mental Health · `goals` · radio · required
  - begginer · `goals` · radio · required
  - basic course · `goals` · radio · required
  - Fat Loss + Testosterone Boost + T3 & T4 Improvement · `goals` · radio · required
  - immunity · `goals` · radio · required
  - home workout · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - Pain Management · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Improve posture · `goals` · radio · required
  - Body Tone · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Weight gain · `goals` · radio · required
  - Strength boosting · `goals` · radio · required
  - Stiff Shoulder · `goals` · radio · required
  - Increase football skills · `goals` · radio · required
  - yoga · `goals` · radio · required
  - Massage · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve strength · `goals` · radio · required
  - Muscle Endurance · `goals` · radio · required
  - strength · `goals` · radio · required
  - improve Muscle blood flow · `goals` · radio · required
  - Full Body Energizer · `goals` · radio · required
  - Sports specific · `goals` · radio · required
  - Performance · `goals` · radio · required
  - Shoulder Rehab · `goals` · radio · required
  - circuit training · `goals` · radio · required
  - Core conditioning · `goals` · radio · required
  - abc · `goals` · radio · required
  - Rehab Programme · `goals` · radio · required
  - Problem · `goals` · radio · required
  - fat loss · `goals` · radio · required
  - Back problem · `goals` · radio · required
  - demo · `goals` · radio · required
  - improve balance · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Improve time · `goals` · radio · required
  - Aerobic base · `goals` · radio · required
  - Heart rate · `goals` · radio · required
  - Rehab · `goals` · radio · required
  - Inch loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - strength training · `goals` · radio · required
  - Running · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - fat loss,muscle tune · `goals` · radio · required
  - strength and size gain · `goals` · radio · required
  - muscle gain, fat loss · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - muscle gain · `goals` · radio · required

Pop-up: **Send Whatsapp Message** — buttons: Send Message
  - Enter a message that you want to send to customer. · `message_body` · textarea

Pop-up: **SubscriptionModal** — buttons: Lookup Member code, Lookup Enquiry code, Add Subscription
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - `renew_start_date` · text
  - Select Membership · `searchbox` · text · required
  - Search... · `membership_plan-0` · text
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code-0` · text
  - [redacted] · `customer_email` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)

Pop-up: **Medical History** — buttons: Save
  - Yes · `heart_problem` · radio · required
  - No · `heart_problem` · radio · required
  - Yes · `diabetes` · radio · required
  - No · `diabetes` · radio · required
  - Yes · `chest_pain_while_exercise` · radio · required
  - No · `chest_pain_while_exercise` · radio · required
  - Yes · `feel_faint` · radio · required
  - No · `feel_faint` · radio · required
  - Yes · `back_pain_or_joints_pain` · radio · required
  - No · `back_pain_or_joints_pain` · radio · required
  - Yes · `asthma` · radio · required
  - No · `asthma` · radio · required
  - Yes · `medication` · radio · required
  - No · `medication` · radio · required
  - Yes · `any_surgery` · radio · required
  - No · `any_surgery` · radio · required
  - Yes · `any_reason_to_modify_exercise` · radio · required
  - No · `any_reason_to_modify_exercise` · radio · required
  - Yes · `pregnant` · radio · required
  - No · `pregnant` · radio · required
  - Yes · `allergies` · radio · required
  - No · `allergies` · radio · required
  - Yes · `medical_problem` · radio · required
  - No · `medical_problem` · radio · required
  - `medical_note` · textarea

Pop-up: **Freeze Subscription** — buttons: Freeze Subscription
  - Select Membership · `freeze_membership_plan` · select · required · options: Select Subscription
  - dd-mm-yyyy · `freeze_start_date` · text
  - `freeze_days` · number · required
  - Freeze for Days · `freeze_price` · text
  - Freeze for Days · `freeze_note` · text

Pop-up: **Extend Subscription** — buttons: Extend Subscription
  - Select Membership · `extend_membership_plan` · select · required · options: Select Subscription
  - `extend_days` · number · required
  - Freeze for Days · `extend_price` · text · required
  - Freeze for Days · `extendsion_note` · text

Pop-up: **Transfer Subscription** — buttons: Lookup Member code, Lookup Enquiry code, Transfer Subscription
  - Select Membership · `transfer_membership_plan` · select · required · options: Select Subscription
  - Enter Member Code/Enquiry Code/Phone Number · `cust_id` · text · required
  - `start_date` · text · required
  - End Date · `end_date` · text
  - Freeze for Days · `transfer_price` · text

Pop-up: **Upgrade Subscription** — buttons: Apply, Upgrade Subscription
  - Select Subscription · `sub_upgrade_membership_plan` · select · required · options: Select Subscription you wish to upgrade
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `upgrade_membership_plan` · select · required · options: {24 people/records}
  - Start Date · `upgrade_start_date` · text · required
  - End Date · `upgrade_end_date` · text · required
  - Base Price · `base_price` · text
  - Subscription Paid Price · `id_subscription_paid_price` · text
  - Sales Price · `sales_price` · text · required
  - Coupon Code · `upgrade_coupon_code` · text

Pop-up: **SubscriptionModall** — buttons: Lookup Member code, Lookup Enquiry code, Add Subscription
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - Select Membership · `searchboxpt` · text · required
  - Search... · `membership_plan-0` · text
  - [redacted] · `customer_email` · text · required
  - Select Trainer · `searchboxptt` · text · required
  - Search... · `trainer_trail_select-0` · text
  - `second_trainer_trail_select` · multiselect · options: {8 people/records}
  - `pt_points-0` · number · required · default 0
  - `pt_sessions-0` · number · required
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Yes · `devide_sessions_between_couple` · radio
  - No · `devide_sessions_between_couple` · radio
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code` · text
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)

Pop-up: **Downgrade Subscription** — buttons: Downgrade Subscription
  - `downgrade_subscription` · select · required · options: Select Subscription
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `membership_plan-0` · select · required · options: Please Select Subscription
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - Freeze for Days · `downgrade_note` · text

Pop-up: **Book a Trial** — buttons: Add Subscription
  - `membership_plan-0` · select · required · options: Select Membership, Free Trail - PT
  - `trainer_trail_select-0` · select · required · options: {9 people/records}
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `pt_sessions-0` · number · required
  - `plan_price-0` · text · required

Pop-up: **Add Member to device** — buttons: Add Member to Device
  - `essl_code` · number · required
  - `rfid` · number

Pop-up: **ADD CUSTOMER TO VITAL DEVICE** — buttons: Add User To Vital Device
  - `device_list` · select · required · options: 
  - `device_ou_id` · select · required · options: 

Pop-up: **ADD CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Add User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices

Pop-up: **UPDATE EXPIRY RULE FOR CUSTOMER (NEW)** — buttons: Update User Data To Biometric Device
  - `biometric_code` · number · required
  - `expiry_date` · text · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices

Pop-up: **ADD CUSTOMER TO REGISTER FACE IN DEVICE** — buttons: Add User To Fingerprint Device
  - Finger · `timmy_command_type` · radio · required
  - Face · `timmy_command_type` · radio
  - QR Code · `timmy_command_type` · radio
  - RFID Card · `timmy_command_type` · radio
  - `timmy_device_list` · select · required · options: Select Devices

Pop-up: **ADD CUSTOMER TO HAPPY HOURS** — buttons: SAVE
  - `timmy_device_happy_hr_range` · select · options: --Select--, Remove From Happy Hour, Range 1 (10:00 AM to 4:00 PM)

Pop-up: **BLOCK/UNBLOCK CUSTOMER** — buttons: NO, YES

Pop-up: **ADD CUSTOMER TO REGISTER FINGER IN DEVICE** — buttons: Add User To ZKTeco Device
  - `auth_user_id` · text
  - `user_name` · text
  - Finger · `zk_command_type` · radio

Pop-up: **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Delete User From Device
  - `del_auth_user_id` · text
  - `del_user_name` · text

Pop-up: **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Un-Block User From Device
  - `ublock_auth_user_id` · text
  - `ublock_user_name` · text

Pop-up: **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Block User From Device
  - `block_auth_user_id` · text
  - `block_user_name` · text

Pop-up: **BLOCK CUSTOMER FACE IN DEVICE** — buttons: Block User To SmartOffice Device
  - `smart_office_serial_number_block` · select · required · options: Select Devices, None: Device

Pop-up: **RE-ENROLL CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Enroll User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices

Pop-up: **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Delete User From Device
  - `device_list` · select · required · options: Select Devices

Pop-up: **SYNC CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Sync User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio

Pop-up: **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Block User From Device
  - `device_list` · select · required · options: Select Devices

Pop-up: **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Un-Block User From Device
  - `device_list` · select · required · options: Select Devices

Pop-up: **Delete Member from device** — buttons: Delete Member to Device

Pop-up: **Activate Member from device** — buttons: Activate Member to Device

Pop-up: **Add Member to device Face** — buttons: Add Member & Face
  - `essl_code` · number · required
  - `rfid` · number

Pop-up: **Add Member to Etime Device** — buttons: Add Fingerprint
  - `essl_code` · number · required
  - `rfid` · number

Pop-up: **Sync RFID to all you Gym Branches** — buttons: Sync RFID

### ClientsSubscription Report

`/merchant/fitness-center/customers/collection-register/?gym_new=1&start_date={id}-07-08 00:00:00&end_date={id}-10-08 23:59:59`

Headings: ClientsSubscription Report
Columns: Invoice No.. | Receipt No. | Receipt Date | Customer Id. | Customer Name | Receipt added by | Plan Name | Start Date | End Date | Mode | Total Bill Amount | Receipt Paid Amount | Total Balance Amount | Action
Filter labels: End Date · Start Date · Subscription Type · Select Type
Actions: Reset Password · Log Out · Search · Submit · Export to CSV

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **ClientsSubscription Report**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Name or Mobile Number or Email · `search_list` · text
- [button] Search
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `sub_type` · select · options: ALL, GYM, PT
  - `cust_type` · select · options: All Member, New Member, Renewal
- [button] Export to CSV
  - `check-all-box` · checkbox

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

Opens: `/fitness-center/customer/make-payment/Customer-{id}/{id}/` · `/get_overall_reciept/NjI3NTY3OA/?&receipt_by= {id}` · `/get_overall_reciept/NjI3NTY2OA/?&receipt_by= {id}` · `/get_overall_reciept/NjA0Njg1Mw/?&receipt_by= {id}` · `/get_overall_reciept/NjE3NjI1MA/?&receipt_by= {id}` · `/get_overall_reciept/NjA1OTkyOA/?&receipt_by= {id}` · `/get_overall_reciept/NjAyNDc5Mw/?&receipt_by= {id}` · `/get_overall_reciept/NjAyMjc4MQ/?&receipt_by= {id}` · `/get_overall_reciept/NjAyMjc1MQ/?&receipt_by= {id}` · `/get_overall_reciept/NjAxNDAxMA/?&receipt_by= {id}` · `/get_overall_reciept/NTk5NzMzMw/?&receipt_by= {id}` · `/get_overall_reciept/NTk5NzM0Ng/?&receipt_by= {id}` · `/get_overall_reciept/NTk4NzgwNQ/?&receipt_by= {id}` · `/get_overall_reciept/NTk0NDYyNw/?&receipt_by= {id}` · `/get_overall_reciept/NTkzNDkxMQ/?&receipt_by= {id}` · `/get_overall_reciept/NTg5Njc5Mw/?&receipt_by= {id}` · `/get_overall_reciept/NTg5Njc5Nw/?&receipt_by= {id}` · `/get_overall_reciept/NTkwMzk1NQ/?&receipt_by= {id}` · `/get_overall_reciept/NTgzMjY5Mw/?&receipt_by= {id}` · `/get_overall_reciept/NTgzMjMzMA/?&receipt_by= {id}`

### ClientsSubscription Report

`/merchant/fitness-center/customers/collection-register/?gym_ren=1&start_date={id}-07-08 00:00:00&end_date={id}-10-08 23:59:59`

Headings: ClientsSubscription Report
Columns: Invoice No.. | Receipt No. | Receipt Date | Customer Id. | Customer Name | Receipt added by | Plan Name | Start Date | End Date | Mode | Total Bill Amount | Receipt Paid Amount | Total Balance Amount | Action
Filter labels: End Date · Start Date · Subscription Type · Select Type
Actions: Reset Password · Log Out · Search · Submit · Export to CSV

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **ClientsSubscription Report**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Name or Mobile Number or Email · `search_list` · text
- [button] Search
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `sub_type` · select · options: ALL, GYM, PT
  - `cust_type` · select · options: All Member, New Member, Renewal
- [button] Export to CSV
  - `check-all-box` · checkbox

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

Opens: `/fitness-center/customer/make-payment/Customer-{id}/{id}/` · `/get_overall_reciept/NjM5MzUzOQ/?&receipt_by= {id}` · `/get_overall_reciept/NjM0OTI2MQ/?&receipt_by= {id}` · `/get_overall_reciept/NjM0OTI4Mw/?&receipt_by= {id}` · `/get_overall_reciept/NjMyOTU4OA/?&receipt_by= {id}` · `/get_overall_reciept/NjMxNDY0OQ/?&receipt_by= {id}` · `/get_overall_reciept/NjMxNDU1Mg/?&receipt_by= {id}` · `/get_overall_reciept/NjMxNDUzNg/?&receipt_by= {id}` · `/get_overall_reciept/NjI3OTM2Mg/?&receipt_by= {id}` · `/get_overall_reciept/NjI3OTc2NQ/?&receipt_by= {id}` · `/get_overall_reciept/NjI1NTE5OQ/?&receipt_by= {id}` · `/get_overall_reciept/NjIxNDEwMA/?&receipt_by= {id}` · `/get_overall_reciept/NjMxNDY4NA/?&receipt_by= {id}` · `/get_overall_reciept/NjI1NTIyNw/?&receipt_by= {id}` · `/get_overall_reciept/NjE3NTE1Ng/?&receipt_by= {id}` · `/get_overall_reciept/NjE2MDYxMg/?&receipt_by= {id}` · `/get_overall_reciept/NjE3NTgzMw/?&receipt_by= {id}` · `/get_overall_reciept/NjE1MzMxNA/?&receipt_by= {id}` · `/get_overall_reciept/NjE1MzMyNA/?&receipt_by= {id}` · `/get_overall_reciept/NjEzNTkzMw/?&receipt_by= {id}` · `/get_overall_reciept/NjEzNTk5MA/?&receipt_by= {id}` · `/get_overall_reciept/NjE3NTk4MQ/?&receipt_by= {id}` · `/get_overall_reciept/NjEwNDU5Ng/?&receipt_by= {id}` · `/get_overall_reciept/NjEwNDU5Nw/?&receipt_by= {id}` · `/get_overall_reciept/NjA3MjQzNA/?&receipt_by= {id}` · `/get_overall_reciept/NjA5OTgyNg/?&receipt_by= {id}` · `/get_overall_reciept/NjA2NDE3OQ/?&receipt_by= {id}` · `/get_overall_reciept/NjAzOTIyOA/?&receipt_by= {id}` · `/get_overall_reciept/NjAwMDkwMw/?&receipt_by= {id}` · `/get_overall_reciept/NjAwMDgzMQ/?&receipt_by= {id}` · `/get_overall_reciept/NjAwMDg5NA/?&receipt_by= {id}` · `/get_overall_reciept/NTk5OTM0NQ/?&receipt_by= {id}` · `/get_overall_reciept/NTk5OTYzNg/?&receipt_by= {id}` · `/get_overall_reciept/NjAwMDc2NQ/?&receipt_by= {id}` · `/get_overall_reciept/NjAwMDgxNw/?&receipt_by= {id}` · `/get_overall_reciept/NjAwMDgxOA/?&receipt_by= {id}` · `/get_overall_reciept/NjA1MTUwMg/?&receipt_by= {id}` · `/get_overall_reciept/NjA1MjcwNg/?&receipt_by= {id}` · `/get_overall_reciept/NTk0OTA3Mg/?&receipt_by= {id}` · `/get_overall_reciept/NjAwMDkyMQ/?&receipt_by= {id}` · `/get_overall_reciept/NTkxMDk0OA/?&receipt_by= {id}` · `/get_overall_reciept/NTkxOTc0NA/?&receipt_by= {id}` · `/get_overall_reciept/NTgzODY2MQ/?&receipt_by= {id}` · `/get_overall_reciept/NTg2MzY5MA/?&receipt_by= {id}` · `/get_overall_reciept/NTg3ODMxOA/?&receipt_by= {id}` · `/get_overall_reciept/NTg3ODMzMg/?&receipt_by= {id}` · `/get_overall_reciept/NTgzOTA4OQ/?&receipt_by= {id}` · `/get_overall_reciept/NTg3ODQzMA/?&receipt_by= {id}` · `/get_overall_reciept/NjIxNDA5Mg/?&receipt_by= {id}`

### ClientsSubscription Report

`/merchant/fitness-center/customers/collection-register/?pt_new=1&start_date={id}-07-08 00:00:00&end_date={id}-10-08 23:59:59`

Headings: ClientsSubscription Report
Columns: Invoice No.. | Receipt No. | Receipt Date | Customer Id. | Customer Name | Receipt added by | Plan Name | Start Date | End Date | Mode | Total Bill Amount | Receipt Paid Amount | Total Balance Amount | Action
Filter labels: End Date · Start Date · Subscription Type · Select Type
Actions: Reset Password · Log Out · Search · Submit · Export to CSV

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **ClientsSubscription Report**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Name or Mobile Number or Email · `search_list` · text
- [button] Search
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `sub_type` · select · options: ALL, GYM, PT
  - `cust_type` · select · options: All Member, New Member, Renewal
- [button] Export to CSV
  - `check-all-box` · checkbox

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

Opens: `/fitness-center/customer/make-payment/Customer-{id}/{id}/` · `/get_overall_reciept/NjM5NDE0MA/?&receipt_by= {id}` · `/get_overall_reciept/NjM2MzU4Mw/?&receipt_by= {id}` · `/get_overall_reciept/NjM1MDg3Mg/?&receipt_by= {id}` · `/get_overall_reciept/NjI3Mjc5Nw/?&receipt_by= {id}` · `/get_overall_reciept/NjA0MDg5Mw/?&receipt_by= {id}` · `/get_overall_reciept/NTk2MTMzOQ/?&receipt_by= {id}`

### ClientsSubscription Report

`/merchant/fitness-center/customers/collection-register/?pt_ren=1&start_date={id}-07-08 00:00:00&end_date={id}-10-08 23:59:59`

Headings: ClientsSubscription Report
Columns: Invoice No.. | Receipt No. | Receipt Date | Customer Id. | Customer Name | Receipt added by | Plan Name | Start Date | End Date | Mode | Total Bill Amount | Receipt Paid Amount | Total Balance Amount | Action
Filter labels: End Date · Start Date · Subscription Type · Select Type
Actions: Reset Password · Log Out · Search · Submit · Export to CSV

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **ClientsSubscription Report**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Name or Mobile Number or Email · `search_list` · text
- [button] Search
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `sub_type` · select · options: ALL, GYM, PT
  - `cust_type` · select · options: All Member, New Member, Renewal
- [button] Export to CSV
  - `check-all-box` · checkbox

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

Opens: `/fitness-center/customer/make-payment/Customer-{id}/{id}/` · `/get_overall_reciept/NjMyOTk3NA/?&receipt_by= {id}` · `/get_overall_reciept/NjMzNDMzMA/?&receipt_by= {id}` · `/get_overall_reciept/NjIwNjI5MQ/?&receipt_by= {id}` · `/get_overall_reciept/NjE2ODgyMg/?&receipt_by= {id}` · `/get_overall_reciept/NjE3OTYzMw/?&receipt_by= {id}` · `/get_overall_reciept/NjA2MDE4OA/?&receipt_by= {id}` · `/get_overall_reciept/NTkyNDUwMw/?&receipt_by= {id}` · `/get_overall_reciept/NjAwMDg2Ng/?&receipt_by= {id}` · `/get_overall_reciept/NjAwMDg0Mg/?&receipt_by= {id}` · `/get_overall_reciept/NTk0OTI2OQ/?&receipt_by= {id}` · `/get_overall_reciept/NTk0OTI3OQ/?&receipt_by= {id}` · `/get_overall_reciept/NTkyNDU5OQ/?&receipt_by= {id}`

### Follow Up Dashboard Welcome, [person]

`/merchant/fitness-center/customers/follow-up-list-new/?is_apply_filer=1&client_select=enquiry&start_date={id}-09-08&end_date={id}-09-23`

Headings: Follow Up Dashboard Welcome, [person]
Columns: Name & Number | Client Rep. | Type | Assign/Schedule by | Comment | Comment Date | Convertibility | Next Follow up Date | Follow Up Date | Follow Up Assign to | Follow Up Type
Columns: Follow Up Date | Follow Up Assign to | Follow Up Type | Comment
Filter labels: Gender · Convertibility · Call Response · Assign To · What would you like to do ? · From · Comment Added By · Client Rep. · Follow Up Type · Client Type
Actions: Reset Password · Log Out · Delete · Transfer Follow ups · View Analysis · Export to CSV · Search · Send Notification · Send Customized WhatsApp · Quick Follow Up

Form 2:
- **Follow Up Dashboard Welcome, [person]**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
- [button] Delete
- [button] Transfer Follow ups
- [button] x
- **Transfer Follow Ups**
- **Transfer From**
  - Select Staff from · `transfer_from` · select · required · options: {6 people/records}
- **Transfer to**
  - Select Staff from · `transfer_to` · select · required · options: {6 people/records}
- [button] Close
- [button] Transfer follow ups
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE SELECTED FOLLOW-UP ?**
- [button] Yes
- [button] No
  - `gender_select` · select · options: All, Male, Female, Other
  - `convert_select` · select · options: All Convertibility, Hot, Warm, Cold, Expected, Unpitched
  - `type_select` · select · options: All Status, Open, Follow Ups Done, Not Interested, Successfull
  - Assign To · `staff_assign_select` · select · options: {8 people/records}
  - What would you like to do ? · `cust_followup_type` · select · options: Missed /Due Follow Ups, Follow Ups Done, Expected Follow Ups
  - `end_picker_date` · text
  - `start_picker_date` · text
  - Comment Added By · `comment_added_select` · select · options: All Staff, System Generated, [person], [person], [person], [person], [person], [person]
  - Client Rep. · `client_rep_select` · select · options: {7 people/records}
  - `followup_type` · select · options: All Follow Up Type, Membership Renewal, Enquiry, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Referral, Transfer, Upgrade, Online Prospect(Non gym), Online Training, Trial Online PT, Trial Online PT Feedback, Nutrition, Other, Ex-Member, Ready To Sign Up … (+4)
  - `client_select` · select · options: All, Enquiry, Member
- [button] Export to CSV
- [button] Search
  - `show_staff_insights` · checkbox
- [button] Send Notification
- [button] Send Customized WhatsApp
- [button] x
- **Send SMS**
- **SMS Body**
  - Keep your SMS short. · `text_sms_body` · textarea
- [button] Send SMS
- [button] Cancel
- [button] x
- **Send Notification**
- **Notification**
  - Make sure your title is short and explanatory. · `noti_name` · text
- **Notification Body**
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea
- [button] Close
- [button] Send Notification
- [button] x
- **SEND WHATSAPP MESSAGE**
  - Write your whatsapp message here... · `text_sms_body` · textarea
- [button] Send WhatsApp
- [button] Cancel
  - Call Response * · `check-all-box` · checkbox
- [button] x
- **Schedule Follow Up**
- **[row value]**
- **Follow up Details**
- **[row value]**
- [button] Cancel
- [button] Confirm
- **Member Follow Up History**
- [button] See history
- [button] x
- **... repeated once per row (4 rows on the page)**

Pop-up: **Transfer Follow Ups** — buttons: Transfer follow ups
  - Select Staff from · `transfer_from` · select · required · options: {6 people/records}
  - Select Staff from · `transfer_to` · select · required · options: {6 people/records}

Pop-up: **ARE YOU SURE YOU WANT TO DELETE SELECTED FOLLOW-UP ?** — buttons: No

Pop-up: **Send SMS** — buttons: Send SMS, Cancel
  - Keep your SMS short. · `text_sms_body` · textarea

Pop-up: **Send Notification** — buttons: Send Notification
  - Make sure your title is short and explanatory. · `noti_name` · text
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea

Pop-up: **SEND WHATSAPP MESSAGE** — buttons: Send WhatsApp, Cancel
  - Write your whatsapp message here... · `text_sms_body` · textarea

Pop-up: **Schedule Follow Up** — buttons: Cancel
  - `call_rep` · select · options: {8 people/records}
  - `followup_date` · text
  - Assign To * · `employee_select` · select · options: {7 people/records}
  - Convertibility * · `lead_type` · select · required · options: Hot, Warm / Maybe, Cold / Not so interested, Expected, Unpitched
  - `expected_date` · date
  - `expected_amt` · number
  - `followup_notes` · textarea
  - `quick_msg` · select · options: Quick Message, Not reachable, No answer, Waiting, Busy, Incorrect, Interested, Switch Off, Call, JOINING CALL, COURTESY CALL, Call Again, JOINING CALL, COURTESY CALL, Inquired but did not ask for payment, Inquired & Payment link sent or to be sent., Call later same day or tomorrow or some other month, Costly Can not afford, Phone Cut, Half Call.Call again, Not Interested, Inquired by mistake, Joined Somewhere else, Other
  - `contact_type` · select · required · options: Phone, In Person, Email, Whatsapp, SMS
  - `followup_comment` · textarea
  - `my_followup_type` · select · options: All Followup, Membership Renewal, Enquiry, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Online Prospect(Non gym), Online Training, Trial Online PT, Trial Online PT Feedback, Nutrition, Confirmation Calls, Gym/Studio Trial, Other

Opens: `/fitness-center/customer/folloup-history/Customer-{id}/0/` · `/fitness-center/customer/subscriptions/Customer-{id}/0/`

### Follow Up Dashboard Welcome, [person]

`/merchant/fitness-center/customers/follow-up-list-new/?is_apply_filer=1&client_select=enquiry&start_date={id}-08-09&end_date={id}-09-08`

Headings: Follow Up Dashboard Welcome, [person]
Columns: Name & Number | Client Rep. | Type | Assign/Schedule by | Comment | Comment Date | Convertibility | Next Follow up Date | Follow Up Date | Follow Up Assign to | Follow Up Type
Columns: Follow Up Date | Follow Up Assign to | Follow Up Type | Comment
Filter labels: Gender · Convertibility · Call Response · Assign To · What would you like to do ? · From · Comment Added By · Client Rep. · Follow Up Type · Client Type
Actions: Reset Password · Log Out · Delete · Transfer Follow ups · View Analysis · Export to CSV · Search · Send Notification · Send Customized WhatsApp · Quick Follow Up

Form 2:
- **Follow Up Dashboard Welcome, [person]**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
- [button] Delete
- [button] Transfer Follow ups
- [button] x
- **Transfer Follow Ups**
- **Transfer From**
  - Select Staff from · `transfer_from` · select · required · options: {6 people/records}
- **Transfer to**
  - Select Staff from · `transfer_to` · select · required · options: {6 people/records}
- [button] Close
- [button] Transfer follow ups
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE SELECTED FOLLOW-UP ?**
- [button] Yes
- [button] No
  - `gender_select` · select · options: All, Male, Female, Other
  - `convert_select` · select · options: All Convertibility, Hot, Warm, Cold, Expected, Unpitched
  - `type_select` · select · options: All Status, Open, Follow Ups Done, Not Interested, Successfull
  - Assign To · `staff_assign_select` · select · options: {8 people/records}
  - What would you like to do ? · `cust_followup_type` · select · options: Missed /Due Follow Ups, Follow Ups Done, Expected Follow Ups
  - `end_picker_date` · text
  - `start_picker_date` · text
  - Comment Added By · `comment_added_select` · select · options: All Staff, System Generated, [person], [person], [person], [person], [person], [person]
  - Client Rep. · `client_rep_select` · select · options: {7 people/records}
  - `followup_type` · select · options: All Follow Up Type, Membership Renewal, Enquiry, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Referral, Transfer, Upgrade, Online Prospect(Non gym), Online Training, Trial Online PT, Trial Online PT Feedback, Nutrition, Other, Ex-Member, Ready To Sign Up … (+4)
  - `client_select` · select · options: All, Enquiry, Member
- [button] Export to CSV
- [button] Search
  - `show_staff_insights` · checkbox
- [button] Send Notification
- [button] Send Customized WhatsApp
- [button] x
- **Send SMS**
- **SMS Body**
  - Keep your SMS short. · `text_sms_body` · textarea
- [button] Send SMS
- [button] Cancel
- [button] x
- **Send Notification**
- **Notification**
  - Make sure your title is short and explanatory. · `noti_name` · text
- **Notification Body**
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea
- [button] Close
- [button] Send Notification
- [button] x
- **SEND WHATSAPP MESSAGE**
  - Write your whatsapp message here... · `text_sms_body` · textarea
- [button] Send WhatsApp
- [button] Cancel
  - Call Response * · `check-all-box` · checkbox
- [button] x
- **Schedule Follow Up**
- **[row value]**
- **Follow up Details**
- **[row value]**
- [button] Cancel
- [button] Confirm
- **Member Follow Up History**
- [button] See history
- [button] x
- **... repeated once per row (15 rows on the page)**

Pop-up: **Transfer Follow Ups** — buttons: Transfer follow ups
  - Select Staff from · `transfer_from` · select · required · options: {6 people/records}
  - Select Staff from · `transfer_to` · select · required · options: {6 people/records}

Pop-up: **ARE YOU SURE YOU WANT TO DELETE SELECTED FOLLOW-UP ?** — buttons: No

Pop-up: **Send SMS** — buttons: Send SMS, Cancel
  - Keep your SMS short. · `text_sms_body` · textarea

Pop-up: **Send Notification** — buttons: Send Notification
  - Make sure your title is short and explanatory. · `noti_name` · text
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea

Pop-up: **SEND WHATSAPP MESSAGE** — buttons: Send WhatsApp, Cancel
  - Write your whatsapp message here... · `text_sms_body` · textarea

Pop-up: **Schedule Follow Up** — buttons: Cancel
  - `call_rep` · select · options: {8 people/records}
  - `followup_date` · text
  - Assign To * · `employee_select` · select · options: {7 people/records}
  - Convertibility * · `lead_type` · select · required · options: Hot, Warm / Maybe, Cold / Not so interested, Expected, Unpitched
  - `expected_date` · date
  - `expected_amt` · number
  - `followup_notes` · textarea
  - `quick_msg` · select · options: Quick Message, Not reachable, No answer, Waiting, Busy, Incorrect, Interested, Switch Off, Call, JOINING CALL, COURTESY CALL, Call Again, JOINING CALL, COURTESY CALL, Inquired but did not ask for payment, Inquired & Payment link sent or to be sent., Call later same day or tomorrow or some other month, Costly Can not afford, Phone Cut, Half Call.Call again, Not Interested, Inquired by mistake, Joined Somewhere else, Other
  - `contact_type` · select · required · options: Phone, In Person, Email, Whatsapp, SMS
  - `followup_comment` · textarea
  - `my_followup_type` · select · options: All Followup, Membership Renewal, Enquiry, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Online Prospect(Non gym), Online Training, Trial Online PT, Trial Online PT Feedback, Nutrition, Confirmation Calls, Gym/Studio Trial, Other

Opens: `/fitness-center/customer/folloup-history/Customer-{id}/0/` · `/fitness-center/customer/subscriptions/Customer-{id}/0/`

### Follow Up Dashboard Welcome, [person]

`/merchant/fitness-center/customers/follow-up-list-new/?is_apply_filer=1&client_select=enquiry&start_date={id}-07-10&end_date={id}-08-09`

Headings: Follow Up Dashboard Welcome, [person]
Columns: Name & Number | Client Rep. | Type | Assign/Schedule by | Comment | Comment Date | Convertibility | Next Follow up Date | Follow Up Date | Follow Up Assign to | Follow Up Type
Columns: Follow Up Date | Follow Up Assign to | Follow Up Type | Comment
Filter labels: Gender · Convertibility · Call Response · Assign To · What would you like to do ? · From · Comment Added By · Client Rep. · Follow Up Type · Client Type
Actions: Reset Password · Log Out · Delete · Transfer Follow ups · View Analysis · Export to CSV · Search · Send Notification · Send Customized WhatsApp · Quick Follow Up

Form 2:
- **Follow Up Dashboard Welcome, [person]**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
- [button] Delete
- [button] Transfer Follow ups
- [button] x
- **Transfer Follow Ups**
- **Transfer From**
  - Select Staff from · `transfer_from` · select · required · options: {6 people/records}
- **Transfer to**
  - Select Staff from · `transfer_to` · select · required · options: {6 people/records}
- [button] Close
- [button] Transfer follow ups
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE SELECTED FOLLOW-UP ?**
- [button] Yes
- [button] No
  - `gender_select` · select · options: All, Male, Female, Other
  - `convert_select` · select · options: All Convertibility, Hot, Warm, Cold, Expected, Unpitched
  - `type_select` · select · options: All Status, Open, Follow Ups Done, Not Interested, Successfull
  - Assign To · `staff_assign_select` · select · options: {8 people/records}
  - What would you like to do ? · `cust_followup_type` · select · options: Missed /Due Follow Ups, Follow Ups Done, Expected Follow Ups
  - `end_picker_date` · text
  - `start_picker_date` · text
  - Comment Added By · `comment_added_select` · select · options: All Staff, System Generated, [person], [person], [person], [person], [person], [person]
  - Client Rep. · `client_rep_select` · select · options: {7 people/records}
  - `followup_type` · select · options: All Follow Up Type, Membership Renewal, Enquiry, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Referral, Transfer, Upgrade, Online Prospect(Non gym), Online Training, Trial Online PT, Trial Online PT Feedback, Nutrition, Other, Ex-Member, Ready To Sign Up … (+4)
  - `client_select` · select · options: All, Enquiry, Member
- [button] Export to CSV
- [button] Search
  - `show_staff_insights` · checkbox
- [button] Send Notification
- [button] Send Customized WhatsApp
- [button] x
- **Send SMS**
- **SMS Body**
  - Keep your SMS short. · `text_sms_body` · textarea
- [button] Send SMS
- [button] Cancel
- [button] x
- **Send Notification**
- **Notification**
  - Make sure your title is short and explanatory. · `noti_name` · text
- **Notification Body**
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea
- [button] Close
- [button] Send Notification
- [button] x
- **SEND WHATSAPP MESSAGE**
  - Write your whatsapp message here... · `text_sms_body` · textarea
- [button] Send WhatsApp
- [button] Cancel
  - Call Response * · `check-all-box` · checkbox
- [button] x
- **Schedule Follow Up**
- **[row value]**
- **Follow up Details**
- **[row value]**
- [button] Cancel
- [button] Confirm
- **Member Follow Up History**
- [button] See history
- [button] x
- **... repeated once per row (10 rows on the page)**

Pop-up: **Transfer Follow Ups** — buttons: Transfer follow ups
  - Select Staff from · `transfer_from` · select · required · options: {6 people/records}
  - Select Staff from · `transfer_to` · select · required · options: {6 people/records}

Pop-up: **ARE YOU SURE YOU WANT TO DELETE SELECTED FOLLOW-UP ?** — buttons: No

Pop-up: **Send SMS** — buttons: Send SMS, Cancel
  - Keep your SMS short. · `text_sms_body` · textarea

Pop-up: **Send Notification** — buttons: Send Notification
  - Make sure your title is short and explanatory. · `noti_name` · text
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea

Pop-up: **SEND WHATSAPP MESSAGE** — buttons: Send WhatsApp, Cancel
  - Write your whatsapp message here... · `text_sms_body` · textarea

Pop-up: **Schedule Follow Up** — buttons: Cancel
  - `call_rep` · select · options: {8 people/records}
  - `followup_date` · text
  - Assign To * · `employee_select` · select · options: {7 people/records}
  - Convertibility * · `lead_type` · select · required · options: Hot, Warm / Maybe, Cold / Not so interested, Expected, Unpitched
  - `expected_date` · date
  - `expected_amt` · number
  - `followup_notes` · textarea
  - `quick_msg` · select · options: Quick Message, Not reachable, No answer, Waiting, Busy, Incorrect, Interested, Switch Off, Call, JOINING CALL, COURTESY CALL, Call Again, JOINING CALL, COURTESY CALL, Inquired but did not ask for payment, Inquired & Payment link sent or to be sent., Call later same day or tomorrow or some other month, Costly Can not afford, Phone Cut, Half Call.Call again, Not Interested, Inquired by mistake, Joined Somewhere else, Other
  - `contact_type` · select · required · options: Phone, In Person, Email, Whatsapp, SMS
  - `followup_comment` · textarea
  - `my_followup_type` · select · options: All Followup, Membership Renewal, Enquiry, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Online Prospect(Non gym), Online Training, Trial Online PT, Trial Online PT Feedback, Nutrition, Confirmation Calls, Gym/Studio Trial, Other

Opens: `/fitness-center/customer/folloup-history/Customer-{id}/0/` · `/fitness-center/customer/subscriptions/Customer-{id}/0/`

### Follow Up Dashboard Welcome, [person]

`/merchant/fitness-center/customers/follow-up-list-new/?is_apply_filer=1&client_select=enquiry&start_date={id}-01-01&end_date={id}-07-10`

Headings: Follow Up Dashboard Welcome, [person]
Columns: Name & Number | Client Rep. | Type | Assign/Schedule by | Comment | Comment Date | Convertibility | Next Follow up Date | Follow Up Date | Follow Up Assign to | Follow Up Type
Columns: Follow Up Date | Follow Up Assign to | Follow Up Type | Comment
Filter labels: Gender · Convertibility · Call Response · Assign To · What would you like to do ? · From · Comment Added By · Client Rep. · Follow Up Type · Client Type
Actions: Reset Password · Log Out · Delete · Transfer Follow ups · View Analysis · Export to CSV · Search · Send Notification · Send Customized WhatsApp · Quick Follow Up

Form 2:
- **Follow Up Dashboard Welcome, [person]**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
- [button] Delete
- [button] Transfer Follow ups
- [button] x
- **Transfer Follow Ups**
- **Transfer From**
  - Select Staff from · `transfer_from` · select · required · options: {6 people/records}
- **Transfer to**
  - Select Staff from · `transfer_to` · select · required · options: {6 people/records}
- [button] Close
- [button] Transfer follow ups
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE SELECTED FOLLOW-UP ?**
- [button] Yes
- [button] No
  - `gender_select` · select · options: All, Male, Female, Other
  - `convert_select` · select · options: All Convertibility, Hot, Warm, Cold, Expected, Unpitched
  - `type_select` · select · options: All Status, Open, Follow Ups Done, Not Interested, Successfull
  - Assign To · `staff_assign_select` · select · options: {8 people/records}
  - What would you like to do ? · `cust_followup_type` · select · options: Missed /Due Follow Ups, Follow Ups Done, Expected Follow Ups
  - `end_picker_date` · text
  - `start_picker_date` · text
  - Comment Added By · `comment_added_select` · select · options: All Staff, System Generated, [person], [person], [person], [person], [person], [person]
  - Client Rep. · `client_rep_select` · select · options: {7 people/records}
  - `followup_type` · select · options: All Follow Up Type, Membership Renewal, Enquiry, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Referral, Transfer, Upgrade, Online Prospect(Non gym), Online Training, Trial Online PT, Trial Online PT Feedback, Nutrition, Other, Ex-Member, Ready To Sign Up … (+4)
  - `client_select` · select · options: All, Enquiry, Member
- [button] Export to CSV
- [button] Search
  - `show_staff_insights` · checkbox
- [button] Send Notification
- [button] Send Customized WhatsApp
- [button] x
- **Send SMS**
- **SMS Body**
  - Keep your SMS short. · `text_sms_body` · textarea
- [button] Send SMS
- [button] Cancel
- [button] x
- **Send Notification**
- **Notification**
  - Make sure your title is short and explanatory. · `noti_name` · text
- **Notification Body**
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea
- [button] Close
- [button] Send Notification
- [button] x
- **SEND WHATSAPP MESSAGE**
  - Write your whatsapp message here... · `text_sms_body` · textarea
- [button] Send WhatsApp
- [button] Cancel
  - Call Response * · `check-all-box` · checkbox
- [button] x
- **Schedule Follow Up**
- **[row value]**
- **Follow up Details**
- **[row value]**
- [button] Cancel
- [button] Confirm
- **Member Follow Up History**
- [button] See history
- [button] x
- **... repeated once per row (15 rows on the page)**

Pop-up: **Transfer Follow Ups** — buttons: Transfer follow ups
  - Select Staff from · `transfer_from` · select · required · options: {6 people/records}
  - Select Staff from · `transfer_to` · select · required · options: {6 people/records}

Pop-up: **ARE YOU SURE YOU WANT TO DELETE SELECTED FOLLOW-UP ?** — buttons: No

Pop-up: **Send SMS** — buttons: Send SMS, Cancel
  - Keep your SMS short. · `text_sms_body` · textarea

Pop-up: **Send Notification** — buttons: Send Notification
  - Make sure your title is short and explanatory. · `noti_name` · text
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea

Pop-up: **SEND WHATSAPP MESSAGE** — buttons: Send WhatsApp, Cancel
  - Write your whatsapp message here... · `text_sms_body` · textarea

Pop-up: **Schedule Follow Up** — buttons: Cancel
  - `call_rep` · select · options: {8 people/records}
  - `followup_date` · text
  - Assign To * · `employee_select` · select · options: {7 people/records}
  - Convertibility * · `lead_type` · select · required · options: Hot, Warm / Maybe, Cold / Not so interested, Expected, Unpitched
  - `expected_date` · date
  - `expected_amt` · number
  - `followup_notes` · textarea
  - `quick_msg` · select · options: Quick Message, Not reachable, No answer, Waiting, Busy, Incorrect, Interested, Switch Off, Call, JOINING CALL, COURTESY CALL, Call Again, JOINING CALL, COURTESY CALL, Inquired but did not ask for payment, Inquired & Payment link sent or to be sent., Call later same day or tomorrow or some other month, Costly Can not afford, Phone Cut, Half Call.Call again, Not Interested, Inquired by mistake, Joined Somewhere else, Other
  - `contact_type` · select · required · options: Phone, In Person, Email, Whatsapp, SMS
  - `followup_comment` · textarea
  - `my_followup_type` · select · options: All Followup, Membership Renewal, Enquiry, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Online Prospect(Non gym), Online Training, Trial Online PT, Trial Online PT Feedback, Nutrition, Confirmation Calls, Gym/Studio Trial, Other

Opens: `/fitness-center/customer/folloup-history/Customer-{id}/0/` · `/fitness-center/customer/subscriptions/Customer-{id}/0/`

### ClientsSubscription Report

`/merchant/fitness-center/customers/collection-register/?gym_new=1&start_date={id}-10-01 00:00:00&end_date={id}-10-31 23:59:59`

Headings: ClientsSubscription Report
Columns: Invoice No.. | Receipt No. | Receipt Date | Customer Id. | Customer Name | Receipt added by | Plan Name | Start Date | End Date | Mode | Total Bill Amount | Receipt Paid Amount | Total Balance Amount | Action
Filter labels: End Date · Start Date · Subscription Type · Select Type
Actions: Reset Password · Log Out · Search · Submit · Export to CSV

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **ClientsSubscription Report**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Name or Mobile Number or Email · `search_list` · text
- [button] Search
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `sub_type` · select · options: ALL, GYM, PT
  - `cust_type` · select · options: All Member, New Member, Renewal
- [button] Export to CSV
  - `check-all-box` · checkbox

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

### ClientsSubscription Report

`/merchant/fitness-center/customers/collection-register/?gym_ren=1&start_date={id}-10-01 00:00:00&end_date={id}-10-31 23:59:59`

Headings: ClientsSubscription Report
Columns: Invoice No.. | Receipt No. | Receipt Date | Customer Id. | Customer Name | Receipt added by | Plan Name | Start Date | End Date | Mode | Total Bill Amount | Receipt Paid Amount | Total Balance Amount | Action
Filter labels: End Date · Start Date · Subscription Type · Select Type
Actions: Reset Password · Log Out · Search · Submit · Export to CSV

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **ClientsSubscription Report**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Name or Mobile Number or Email · `search_list` · text
- [button] Search
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `sub_type` · select · options: ALL, GYM, PT
  - `cust_type` · select · options: All Member, New Member, Renewal
- [button] Export to CSV
  - `check-all-box` · checkbox

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

Opens: `/fitness-center/customer/make-payment/Customer-{id}/{id}/` · `/get_overall_reciept/NjM5MzUzOQ/?&receipt_by= {id}` · `/get_overall_reciept/NjM0OTI2MQ/?&receipt_by= {id}` · `/get_overall_reciept/NjM0OTI4Mw/?&receipt_by= {id}`

### ClientsSubscription Report

`/merchant/fitness-center/customers/collection-register/?pt_new=1&start_date={id}-10-01 00:00:00&end_date={id}-10-31 23:59:59`

Headings: ClientsSubscription Report
Columns: Invoice No.. | Receipt No. | Receipt Date | Customer Id. | Customer Name | Receipt added by | Plan Name | Start Date | End Date | Mode | Total Bill Amount | Receipt Paid Amount | Total Balance Amount | Action
Filter labels: End Date · Start Date · Subscription Type · Select Type
Actions: Reset Password · Log Out · Search · Submit · Export to CSV

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **ClientsSubscription Report**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Name or Mobile Number or Email · `search_list` · text
- [button] Search
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `sub_type` · select · options: ALL, GYM, PT
  - `cust_type` · select · options: All Member, New Member, Renewal
- [button] Export to CSV
  - `check-all-box` · checkbox

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

Opens: `/fitness-center/customer/make-payment/Customer-{id}/{id}/` · `/get_overall_reciept/NjM5NDE0MA/?&receipt_by= {id}` · `/get_overall_reciept/NjM2MzU4Mw/?&receipt_by= {id}` · `/get_overall_reciept/NjM1MDg3Mg/?&receipt_by= {id}`

### ClientsSubscription Report

`/merchant/fitness-center/customers/collection-register/?pt_ren=1&start_date={id}-10-01 00:00:00&end_date={id}-10-31 23:59:59`

Headings: ClientsSubscription Report
Columns: Invoice No.. | Receipt No. | Receipt Date | Customer Id. | Customer Name | Receipt added by | Plan Name | Start Date | End Date | Mode | Total Bill Amount | Receipt Paid Amount | Total Balance Amount | Action
Filter labels: End Date · Start Date · Subscription Type · Select Type
Actions: Reset Password · Log Out · Search · Submit · Export to CSV

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **ClientsSubscription Report**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Name or Mobile Number or Email · `search_list` · text
- [button] Search
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `sub_type` · select · options: ALL, GYM, PT
  - `cust_type` · select · options: All Member, New Member, Renewal
- [button] Export to CSV
  - `check-all-box` · checkbox

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

Opens: `/fitness-center/customer/make-payment/Customer-{id}/{id}/` · `/get_overall_reciept/NjMyOTk3NA/?&receipt_by= {id}`

### ClientsSubscription Report

`/merchant/fitness-center/customers/collection-register-daily/?start_date={id}-10-01 00:00:00&end_date={id}-10-01 23:59:59`

Headings: ClientsSubscription Report
Columns: Invoice No.. | Receipt No. | Receipt Date | Customer Id. | Customer Name | Receipt added by | Plan Name | Start Date | End Date | Mode | Total Bill Amount | Receipt Paid Amount | Total Balance Amount | Action
Filter labels: End Date · Start Date · Subscription Type · Select Type
Actions: Reset Password · Log Out · Search · Submit · Export to CSV

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **ClientsSubscription Report**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Name or Mobile Number or Email · `search_list` · text
- [button] Search
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `sub_type` · select · options: ALL, GYM, PT
  - `cust_type` · select · options: All Member, New Member, Renewal
- [button] Export to CSV
  - `check-all-box` · checkbox

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

Opens: `/fitness-center/customer/make-payment/Customer-{id}/{id}/` · `/get_overall_reciept/NjMyOTk3NA/?&receipt_by= {id}` · `/get_overall_reciept/NjM0OTI2MQ/?&receipt_by= {id}` · `/get_overall_reciept/NjM0OTI4Mw/?&receipt_by= {id}` · `/get_overall_reciept/NjM1MDg3Mg/?&receipt_by= {id}`

### Session RegisterListing

`/merchant/fitness-center/customers/pt-register/?is_apply_filer=1&sub_status=ALL&trainer_id={id}`

Headings: Session RegisterListing
Columns: Invoice Date | Customer Name | Plan Name | Trainer Name | Start Date | End Date | Sessions | Sale Amount | Payment Status | Action
Actions: Reset Password · Log Out · Search · Export to CSV · Back · Next

Form 2:
- **Session RegisterListing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
- [button] x
- **Send SMS**
- **SMS Body**
  - Keep your SMS short. · `text_sms_body` · textarea
- [button] Send SMS
- [button] Cancel
- [button] Export to CSV
  - `membership_plan` · select · options: {15 people/records}
  - `trainer_list` · select · options: {17 people/records}
  - `created_by` · select · options: {15 people/records}
  - `pay_status` · select · options: Payment Status, Paid, Pending
  - `gender_filter` · select · options: Gender, Male, Female, Other
  - `sub_status` · select · options: Subscription Status, Active, Pending, Expired, Used
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

Pop-up: **Send SMS** — buttons: Send SMS, Cancel
  - Keep your SMS short. · `text_sms_body` · textarea

Opens: `/fitness-center/customer/Customer-{id}/` · `/get_overall_reciept/{id}/` · `/fitness-center/customer/pt-session-register/Customer-{id}/{id}/#pt_screen`

### Session RegisterListing

`/merchant/fitness-center/customers/pt-register/?is_apply_filer=1&sub_status=AC&trainer_id={id}`

Headings: Session RegisterListing
Columns: Invoice Date | Customer Name | Plan Name | Trainer Name | Start Date | End Date | Sessions | Sale Amount | Payment Status | Action
Actions: Reset Password · Log Out · Search · Export to CSV · Back · Next

Form 2:
- **Session RegisterListing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
- [button] x
- **Send SMS**
- **SMS Body**
  - Keep your SMS short. · `text_sms_body` · textarea
- [button] Send SMS
- [button] Cancel
- [button] Export to CSV
  - `membership_plan` · select · options: {15 people/records}
  - `trainer_list` · select · options: {17 people/records}
  - `created_by` · select · options: {15 people/records}
  - `pay_status` · select · options: Payment Status, Paid, Pending
  - `gender_filter` · select · options: Gender, Male, Female, Other
  - `sub_status` · select · options: Subscription Status, Active, Pending, Expired, Used
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

Pop-up: **Send SMS** — buttons: Send SMS, Cancel
  - Keep your SMS short. · `text_sms_body` · textarea

### Session RegisterListing

`/merchant/fitness-center/customers/pt-register/?is_apply_filer=1&sub_status=EX&trainer_id={id}`

Headings: Session RegisterListing
Columns: Invoice Date | Customer Name | Plan Name | Trainer Name | Start Date | End Date | Sessions | Sale Amount | Payment Status | Action
Actions: Reset Password · Log Out · Search · Export to CSV · Back · Next

Form 2:
- **Session RegisterListing**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search · `search_list` · text
- [button] Search
- [button] x
- **Send SMS**
- **SMS Body**
  - Keep your SMS short. · `text_sms_body` · textarea
- [button] Send SMS
- [button] Cancel
- [button] Export to CSV
  - `membership_plan` · select · options: {15 people/records}
  - `trainer_list` · select · options: {17 people/records}
  - `created_by` · select · options: {15 people/records}
  - `pay_status` · select · options: Payment Status, Paid, Pending
  - `gender_filter` · select · options: Gender, Male, Female, Other
  - `sub_status` · select · options: Subscription Status, Active, Pending, Expired, Used
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

Pop-up: **Send SMS** — buttons: Send SMS, Cancel
  - Keep your SMS short. · `text_sms_body` · textarea

Opens: `/fitness-center/customer/Customer-{id}/` · `/get_overall_reciept/{id}/` · `/fitness-center/customer/pt-session-register/Customer-{id}/{id}/#pt_screen`

### ClientsSubscription Report

`/merchant/fitness-center/customers/collection-register-daily/?bill_rep={id}&start_date={id}-10-01 00:00:00&end_date={id}-10-31 23:59:59`

Headings: ClientsSubscription Report
Columns: Invoice No.. | Receipt No. | Receipt Date | Customer Id. | Customer Name | Receipt added by | Plan Name | Start Date | End Date | Mode | Total Bill Amount | Receipt Paid Amount | Total Balance Amount | Action
Filter labels: End Date · Start Date · Subscription Type · Select Type
Actions: Reset Password · Log Out · Search · Submit · Export to CSV

Form 2:
- [button] x
- **Filters**
- **Subscriptions**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Subsciption Status**
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
- **Payment Status**
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
- **Bounced**
  - Bounced Subscriptions · `bounced_subs` · checkbox
- [button] Close
- [button] Apply
- **ClientsSubscription Report**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Name or Mobile Number or Email · `search_list` · text
- [button] Search
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `sub_type` · select · options: ALL, GYM, PT
  - `cust_type` · select · options: All Member, New Member, Renewal
- [button] Export to CSV
  - `check-all-box` · checkbox

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Active Subscriptions · `active_sub` · checkbox
  - Pending Subscriptions · `pending_sub` · checkbox
  - Expired Subscriptions · `expired_sub` · checkbox
  - About to expire · `abt_to_exp` · checkbox
  - Retained Subscriptions · `retain_sub` · checkbox
  - Used Subscriptions · `used_sub` · checkbox
  - Paid · `paymnt_status` · checkbox
  - Pending · `paymnt_status` · checkbox
  - Failed · `paymnt_status` · checkbox
  - Bounced Subscriptions · `bounced_subs` · checkbox

Opens: `/fitness-center/customer/make-payment/Customer-{id}/{id}/` · `/get_overall_reciept/NjM5MzUzOQ/?&receipt_by= {id}` · `/get_overall_reciept/NjM5NDE0MA/?&receipt_by= {id}` · `/get_overall_reciept/NjM2MzU4Mw/?&receipt_by= {id}` · `/get_overall_reciept/NjMyOTk3NA/?&receipt_by= {id}` · `/get_overall_reciept/NjM0OTI2MQ/?&receipt_by= {id}` · `/get_overall_reciept/NjM0OTI4Mw/?&receipt_by= {id}` · `/get_overall_reciept/NjM1MDg3Mg/?&receipt_by= {id}`

### Membership Plan Preview

`/fitness-center/membership-plan/Membership-Plan-{id}/`

Headings: Membership Plan Preview · Basic Information · Membership Plan Name · Description · Membership Plan Image · Category · Weekly class limit · Terms and Conditions · FAQs · Guidelines · Pricing and Duration · Tenure
Actions: Reset Password · Log Out · Cancel · Save & Close · Save

Form 2:
- **Basic Information**
- **Membership Plan Name**
- **Description**
- **Membership Plan Image**
- **Category**
- **Weekly class limit**
- **Terms and Conditions**
- **FAQs**
- **Guidelines**
- **Pricing and Duration**
- **Tenure**
- **Pricing**
- **Stock & Activation**
- **Purchase Date**
- **Stock & Activation**
- [button] Cancel
- [button] Save & Close
- [button] Save

Opens: `/fitness-center/membership-plan/basic-information/Membership-Plan-{id}/` · `/fitness-center/membership-plan/pricing-duration/Membership-Plan-{id}/` · `/fitness-center/membership-plan/renewal-stock-settings/Membership-Plan-{id}/`

### Membership Plans

`/fitness-center/membership-plan/basic-information/Membership-Plan-{id}/`

Headings: Membership Plans · Basic Information · Membership category · Assign Trainer · Terms & Condition · Pricing & Duration · Membership Plan Duration · Membership Plan Freeze Days Duration · Class Limiter · Free Trial for New Members · Membership Plan Image · Appointment Per Membership
Filter labels: Membership Plan Name * · Membership Plan Description · Category* · Show Membership in App · Assign Trainer · Session Count · Show Unlimited Sessions in App · Disable WhatsApp Messages & Follow-up · Terms & Condition · Membership Plan Tenure * · Is One Time · Membership Plan Freeze Days · Weekly class limit · Free Trial True · Membership Plan Sequencing in App · Membership Plan Image · Add a photo · FAQs · Guidelines · Dos and Don'ts · Shopping List · Snack List · Activities · Other Text · Appointment Type
Actions: Reset Password · Log Out · Show Optional Fields · Back · Save & Close · Save

Form 2:
  - Membership Plan Name * · `membership_plan_name` · text · required
- **Membership category**
  - Weight Training (1) · `fitness_category` · checkbox
  - Cardio (3) · `fitness_category` · checkbox
  - Cross-fit (4) · `fitness_category` · checkbox
  - Personal Training / Nutrition (9) · `fitness_category` · checkbox
  - Calisthenics (16) · `fitness_category` · checkbox
  - HIIT (20) · `fitness_category` · checkbox
  - Strength Training (21) · `fitness_category` · checkbox
  - Group Activity (71) · `fitness_category` · checkbox
  - Nutrition (75) · `fitness_category` · checkbox
  - Steam (79) · `fitness_category` · checkbox
  - Locker (81) · `fitness_category` · checkbox
  - Free Body Weight (1685) · `fitness_category` · checkbox
  - Yes · `show_in_app` · radio
  - No · `show_in_app` · radio
- **Assign Trainer**
  - Select All · `check-all` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - [person] · `trainer_assign` · checkbox
  - Session Count · `pt_session_count` · text
  - `show_unlimited_sessions` · checkbox
  - Yes · `disabled_msg_followup` · radio
  - No · `disabled_msg_followup` · radio
- **Terms & Condition**
- **Pricing & Duration**
- **Membership Plan Duration**
  - Membership Plan Tenure * · `plan_period_units` · number · required · default 3
  - `plan_period_length` · select · options: Months, Years, Days
  - Is One Time · `is_one_time` · checkbox
- **Membership Plan Freeze Days Duration**
  - E.g. 3 · `freeze_days_units` · number
  - `freeze_days_length` · select · options: Days
- **Class Limiter**
  - Weekly class limit · `class_limit` · text · required
- **Free Trial for New Members**
  - Free Trial · `is_free_trial` · checkbox
- [button] Show Optional Fields
  - `membership_plan_seq` · number · required
- **Membership Plan Image**
  - Add a photo · `center_logo` · file
- **Appointment Per Membership**
  - `appointment_type` · select · options: Select An Appointment Type, Daily, Alternate Day, Every Third Day, Once A Week, One Time

### Coupon Discounts

`/fitness-center/customer/coupon-basic-information/{id}/`

Headings: Coupon Discounts · Terms & Validations · Payment Installments
Filter labels: Coupon Name * · Coupon Code * · Coupon Type * · Coupon Discount * · Select Fitness Service · Select Membership · Member Id · Who can use this coupon? * · Coupon Start Date · Coupon Expiry · Max Redemtions · Max Redemtions Per Customer · Min Order · Max Order · Max Discount Upto (). · Terms & Conditions · No. of Installments · Intervals · Duration · Interest Rate(% p.a)
Actions: Reset Password · Log Out · Lookup Member code · Back · Save & Close · Save

Form 2:
  - e.g. 30% Off for first 100 memberships · `coupon_name` · text · required
  - e.g. 40FIRST100 · `coupon_code` · text · required
  - `coupon_type` · select · required · options: Flat Value, Percentage Discount, Payment Installments, Flat value & Payment Installments, Percentage Discount & Payment Installments
  - e.g. 40 · `coupon_discount` · number · required · default 33.00
- **Terms & Validations**
  - `fitness_service` · select · options: Select Service, Weight Training, Cardio, Cross-fit, Personal Training / Nutrition, Calisthenics, HIIT, Strength Training, Group Activity, Nutrition, Steam, Locker, Free Body Weight
  - Select Fitness Service · `membership_plan` · select · options: {24 people/records}
  - Enter Member Code · `cust_id` · text
  - Who can use this coupon? * · `member_type` · select · required · options: {4 people/records}
  - `coupon_start_date` · text
  - `coupon_expiry` · text
  - `max_users` · number
  - `max_per_user` · number
  - in Rupees · `min_order` · number · default 3999.00
  - in Rupees · `max_order` · number · default 6499.00
  - in Rupees · `max_discount` · number · default 0.00
  - e.g. Valid for new members only. · `terms_conditions` · textarea
- **Payment Installments**
  - `no_of_payments` · select · required · options: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
  - `intervals` · select · required · options: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
  - `duration` · select · required · options: Month, Week, Year
  - `interest_rate` · number · required · default 0
- [button] Back
- [button] Save & Close
- [button] Save

### Clients List

`/merchant/fitness-center/client-database/{id}/1/`

Headings: Clients List
Columns: Client Code | Date of Entry | Name & Number | Type | Handled By | Source OF Promotion | Action
Filter labels: From · Source of Promotion · Employment Type · Lead Type · Client Rep · Batch List · Gender · Client Type · Assigned Trainer · App Status
Actions: Reset Password · Log Out · Search · Delete · Transfer Client · Export to CSV · Refresh Login · Import Members · Incorrect Entries · Add Member · Submit · Send Notification · Send Customized WhatsApp · Remove Members

Form 2:
- [button] x
- **Filters**
- **Enquiries**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Lead Status**
  - Open Enquiry · `lead_status` · checkbox
  - Not Interested · `lead_status` · checkbox
- **Members by Age**
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
- **Lead Type**
  - Hot / Expected · `lead_type` · checkbox
  - Warm / May be · `lead_type` · checkbox
  - Cold / Not so interested · `lead_type` · checkbox
- [button] Close
- [button] Apply
- **Clients List**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Mobile Number or Email Address · `search_list` · text
- [button] Search
- [button] Delete
- [button] Transfer Client
- [button] Export to CSV
- [button] Refresh Login
- [button] Export to CSV
- [button] x
- **ARE YOU SURE YOU WANT TO REFRESH LOGIN SELECTED MEMBER ?**
- [button] Yes
- [button] No
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `source_promo` · select · options: All, Lead by APP, Unknown, GOOGLE ADS, FACEBOOK, WHATSAPP, INSTAGRAM, WORD OF MOUTH, Banner, Walk In, Passing By, Member Referral, Poster, SMS, Website, Flyers, Hoarding, Just Dial, WhatsApp Marketing, ADs, Exterior Sign, Media Article, Television, Promotions, Hotel Guest … (+8)
  - `emp_status` · select · options: All, Unknown, STUDENT, WORKING, NOT WORKING, SELF EMPLOYED, HOUSE WIFE
  - `convert_select` · select · options: All Convertibility, Hot, Warm, Cold, Expected, Unpitched
  - Client Rep · `staff_assign_select` · select · options: {16 people/records}
  - Batch List · `cust_batch_select` · select · options: {27 people/records}
  - `gender_filter` · select · options: All, Male, Female, Other
  - Client Type · `client_type` · select · options: All Clients, Enquiry, Member
  - Assigned Trainer · `trainer_assign_select` · select · options: {17 people/records}
  - App Status · `app_status` · select · options: Select App Status, App Installed, App Not Installed
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS ENQUIRY ?**
- [button] Yes
- [button] No
- [button] Send Notification
- [button] Send Customized WhatsApp
- [button] Remove Members
- [button] x
- **SEND WHATSAPP MESSAGE**
  - Write your whatsapp message here... · `text_sms_body` · textarea
- [button] Send WhatsApp
- [button] Cancel
- [button] x
- **Send Notification**
- **Notification**
  - Make sure your title is short and explanatory. · `noti_name` · text
- **Notification Body**
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea
- [button] Close
- [button] Send Notification
  - `check-all-box` · checkbox

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Open Enquiry · `lead_status` · checkbox
  - Not Interested · `lead_status` · checkbox
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
  - Hot / Expected · `lead_type` · checkbox
  - Warm / May be · `lead_type` · checkbox
  - Cold / Not so interested · `lead_type` · checkbox

Pop-up: **ARE YOU SURE YOU WANT TO REFRESH LOGIN SELECTED MEMBER ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS ENQUIRY ?** — buttons: No

Pop-up: **SEND WHATSAPP MESSAGE** — buttons: Send WhatsApp, Cancel
  - Write your whatsapp message here... · `text_sms_body` · textarea

Pop-up: **Send Notification** — buttons: Send Notification
  - Make sure your title is short and explanatory. · `noti_name` · text
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea

### New Batch Basic Information

`/fitness-center/batch/edit/Batch-{id}/`

Headings: New Batch Basic Information · Assign a Trainer · Service * · Working Days · Timing
Filter labels: Batch Name * · Batch Info · Capacity · Room Name · Batch Banner photo · Conducted by · Services * · Start Date · End Date · Working Days · Start Time * · End Time
Actions: Reset Password · Log Out · Back · Save & Close · Save

Form 2:
  -  Cardio Batch  · `batch_name` · text · required
  - `batch_info` · textarea
  - Batch capacity in digits · `batch_capacity` · number · default 15
  -  Room name eg: Seminar Hall  · `batch_room` · text
  - `trainer_pic` · file
- **Assign a Trainer**
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
  - [person] · `trainer_select` · checkbox
- **Service ***
  - Weight Training · `fitness_category` · checkbox
  - Cardio · `fitness_category` · checkbox
  - Cross-fit · `fitness_category` · checkbox
  - Personal Training / Nutrition · `fitness_category` · checkbox
  - Calisthenics · `fitness_category` · checkbox
  - HIIT · `fitness_category` · checkbox
  - Strength Training · `fitness_category` · checkbox
  - Group Activity · `fitness_category` · checkbox
  - Nutrition · `fitness_category` · checkbox
  - Steam · `fitness_category` · checkbox
  - Locker · `fitness_category` · checkbox
  - Free Body Weight · `fitness_category` · checkbox
- **Working Days**
  - `start_date` · text
  - `end_date` · text
  - Monday · `working_days` · checkbox
  - Tuesday · `working_days` · checkbox
  - Wednesday · `working_days` · checkbox
  - Thursday · `working_days` · checkbox
  - Friday · `working_days` · checkbox
  - Saturday · `working_days` · checkbox
  - Sunday · `working_days` · checkbox
- **Timing**
  - Start Time * · `session_slot_from_1` · text
  - End Time · `session_slot_to_1` · text
  - Unisex · `session_slot_1_gender` · radio · required
  - Men · `session_slot_1_gender` · radio · required
  - Women · `session_slot_1_gender` · radio · required
- [button] Back
- [button] Save & Close
- [button] Save

### Clients List

`/merchant/fitness-center/client-database/{id}/0/?is_apply_filer=SCREEN&&client_type=Member`

Headings: Clients List
Columns: Client Code | Date of Entry | Name & Number | Type | Handled By | Source OF Promotion | Action
Filter labels: From · Source of Promotion · Employment Type · Lead Type · Client Rep · Batch List · Gender · Client Type · Assigned Trainer · App Status
Actions: Reset Password · Log Out · Search · Delete · Transfer Client · Export to CSV · Refresh Login · Import Members · Incorrect Entries · Add Member · Submit · Send Notification · Send Customized WhatsApp · Add Members · Copy code · Actions · Add Follow up · Follow Up History

Form 2:
- [button] x
- **Filters**
- **Enquiries**
- **Gender**
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
- **Lead Status**
  - Open Enquiry · `lead_status` · checkbox
  - Not Interested · `lead_status` · checkbox
- **Members by Age**
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
- **Lead Type**
  - Hot / Expected · `lead_type` · checkbox
  - Warm / May be · `lead_type` · checkbox
  - Cold / Not so interested · `lead_type` · checkbox
- [button] Close
- [button] Apply
- **Clients List**
  - `change_outlet` · select · options: Shaan Fitness Gym (Godari Gunta)
  - Search by Mobile Number or Email Address · `search_list` · text
- [button] Search
- [button] Delete
- [button] Transfer Client
- [button] Export to CSV
- [button] Refresh Login
- [button] Export to CSV
- [button] x
- **ARE YOU SURE YOU WANT TO REFRESH LOGIN SELECTED MEMBER ?**
- [button] Yes
- [button] No
- [button] Submit
  - `end_picker_date` · text
  - `start_picker_date` · text
  - `source_promo` · select · options: All, Lead by APP, Unknown, GOOGLE ADS, FACEBOOK, WHATSAPP, INSTAGRAM, WORD OF MOUTH, Banner, Walk In, Passing By, Member Referral, Poster, SMS, Website, Flyers, Hoarding, Just Dial, WhatsApp Marketing, ADs, Exterior Sign, Media Article, Television, Promotions, Hotel Guest … (+8)
  - `emp_status` · select · options: All, Unknown, STUDENT, WORKING, NOT WORKING, SELF EMPLOYED, HOUSE WIFE
  - `convert_select` · select · options: All Convertibility, Hot, Warm, Cold, Expected, Unpitched
  - Client Rep · `staff_assign_select` · select · options: {16 people/records}
  - Batch List · `cust_batch_select` · select · options: {27 people/records}
  - `gender_filter` · select · options: All, Male, Female, Other
  - Client Type · `client_type` · select · options: All Clients, Enquiry, Member
  - Assigned Trainer · `trainer_assign_select` · select · options: {17 people/records}
  - App Status · `app_status` · select · options: Select App Status, App Installed, App Not Installed
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS ENQUIRY ?**
- [button] Yes
- [button] No
- [button] Send Notification
- [button] Send Customized WhatsApp
- [button] Add Members
- [button] x
- **SEND WHATSAPP MESSAGE**
  - Write your whatsapp message here... · `text_sms_body` · textarea
- [button] Send WhatsApp
- [button] Cancel
- [button] x
- **Send Notification**
- **Notification**
  - Make sure your title is short and explanatory. · `noti_name` · text
- **Notification Body**
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea
- [button] Close
- [button] Send Notification
  - `check-all-box` · checkbox
- [button] Actions
- [button] x
- **Schedule Follow Up**
- **[row value]**
- [button] Cancel
- [button] Confirm
- [button] Actions
- [button] x
- **... repeated once per row (30 rows on the page)**

Pop-up: **Filters** — buttons: Apply
  - Total Males · `gender_filter` · checkbox
  - Total Females · `gender_filter` · checkbox
  - Open Enquiry · `lead_status` · checkbox
  - Not Interested · `lead_status` · checkbox
  - Age 18-24 · `age_member` · checkbox
  - Age 25-34 · `age_member` · checkbox
  - Age 35-44 · `age_member` · checkbox
  - Age 45-54 · `age_member` · checkbox
  - Age 55-64 · `age_member` · checkbox
  - Hot / Expected · `lead_type` · checkbox
  - Warm / May be · `lead_type` · checkbox
  - Cold / Not so interested · `lead_type` · checkbox

Pop-up: **ARE YOU SURE YOU WANT TO REFRESH LOGIN SELECTED MEMBER ?** — buttons: No

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS ENQUIRY ?** — buttons: No

Pop-up: **SEND WHATSAPP MESSAGE** — buttons: Send WhatsApp, Cancel
  - Write your whatsapp message here... · `text_sms_body` · textarea

Pop-up: **Send Notification** — buttons: Send Notification
  - Make sure your title is short and explanatory. · `noti_name` · text
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea

Pop-up: **Schedule Follow Up** — buttons: Cancel
  - `follow_up_type` · select · options: Enquiry, Membership Renewal, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Referral, Transfer, Upgrade, Online Prospect(Non gym), Online Training, Massage, Trial Online PT, Trial Online PT Feedback, Nutrition, Other, Ex-Member, Ready To Sign Up … (+7)
  - Assign To * · `employee_select` · select · options: {15 people/records}
  - Response * · `followup_response` · select · required · options: Open Follow up, Successful Follow up, Not Interested - Rates to high, Not Interested - Joined Another Gym, Not Interested - Wrong number, Not Interested - Relocated, Not Interested - other
  - Convertibility * · `lead_type` · select · required · options: Hot, Warm / Maybe, Cold / Not so interested, Expected, Successful Follow up, Unpitched
  - `expected_date` · date
  - `expected_amt` · number
  - Next Follow Up Date * · `followup_date` · text
  - Contact Type * · `contact_type` · select · required · options: Phone, In Person, Email, Whatsapp, SMS
  - To Do/Comment * · `followup_notes` · textarea
  - `quick_msg` · select · options: Quick Message, Not reachable, No answer, Waiting, Busy, Incorrect, Interested, Switch Off, Call, JOINING CALL, COURTESY CALL, Inquired but did not ask for payment, Inquired & Payment link sent or to be sent., Call later same day or tomorrow or some other month, Costly Cannot afford, Phone Cut, Half Call.Call again, Not Interested, Inquired by mistake, Joined Somewhere else, Other

Opens: `/fitness-center/customer/Customer-{id}/` · `/fitness-center/customer/folloup-history/Customer-{id}/0/` · `/fitness-center/customer/basic-information/Customer-{id}/`

### Payments Details

`/fitness-center/customer/make-payment/Customer-{id}/{id}/`

Headings: Payments Details · [person]
Columns: # | Receipt Number | Receipt Price | Receipt Date | Payment Method | Payment Status
Columns: # | Receipt Number | Receipt Price | Receipt Date | Payment Method | Payment Status | 1
Columns: # | Plan Name | Total Price | New Price
Columns: Invoice Date
Columns: # | Membership | Start Date | End Date | Plan Price | Discount Amount | Net Sale Amount | Total Sale Amount | Total Paid Amount | Total Balance Amount | Payment Status
Filter labels: DOB · Street / Area · Note · Is IGST Bill · Bill Rep*
Actions: Reset Password · Log Out · Go to Receipt Register · Email Receipt · Print Receipt · Send Direct Whatsapp · Send Whatsapp · Cancel Subscription · Delete Subscription · Edit Bill Amount · Submit

Form 3:
- [button] x
- **Cancel Subscription**
- **Warning**
  - Reason for Cancellation · `reason_cancel` · text · required
- [button] Close
- [button] Cancel Subscription

Form 4:
- [button] x
- **Delete Subscription**
- **Warning**
  - Reason for Deletion · `reason_delete` · text · required
- [button] Close
- [button] Delete Subscription

Form 5:
- [button] x
- **Edit Bill Amount**
- **Warning**
- **1**
- **Elite Training [4 Weeks]**
- **7999**
- [button] Close
- [button] Edit Bill Amount

Other fields:
  - `dob` · text
  - Enter Customer Street/Address · `cust_address` · text
  - Enter notes (maximum 300 characters) · `subscription_note` · textarea
  - Yes · `igst` · radio
  - No · `igst` · radio
  - `bill_representative` · select · options: {30 people/records}

Pop-up: **Cancel Subscription** — buttons: Cancel Subscription
  - `tranx_ids` · checkbox
  - Reason for Cancellation · `reason_cancel` · text · required

Pop-up: **Delete Subscription** — buttons: Delete Subscription
  - Reason for Deletion · `reason_delete` · text · required

Pop-up: **Edit Bill Amount** — buttons: Edit Bill Amount
  - Enter New Bill Amount · `reason_bill_amount` · number · required

Opens: `/send_email_reciept/{id}/` · `/get_overall_reciept/NjM5NDE0MA/?&receipt_by= {id}` · `/fitness-center/customer/Customer-{id}/`

### Session Register

`/fitness-center/customer/pt-session-register/Customer-{id}/{id}/#pt_screen`

Headings: Session Register · [person]
Columns: # | Membership | Start Date | End Date | Net Sale Amount | GST | Total Sale Amount | Total Paid Amount | Total Balance Amount | Payment Status
Columns: # | Record Date | Action taken by | Activity | Client Show/No Show | Action
Actions: Reset Password · Log Out · Change Trainer · Change · Record Sessions · Submit

Form 2:
- [button] Change Trainer
- [button] Change Trainer

Opens: `/fitness-center/customer/Customer-{id}/`

### [redacted]

`/get_overall_reciept/{id}/`

Headings: [redacted]

### [redacted]

`/get_invoice/{id}/`

Headings: [redacted]

### Member

`/fitness-center/customer/folloup-history/Customer-{id}/0/#member_history`

Headings: Member · [person] · Membership Actions · Remarks
Columns: # | Membership Plan | Start Date | End Date | Base Price | Selling Price | Apply Coupon | Action
Columns: Followup Type | Followup Date | Reminder Date | Comments | Follow up Status | Added By | Follow Up By | Action | Follow Up Date | Follow Up Assign to | Follow Up Type | Comment | Expected Date | Expected Amount
Columns: Follow Up Date | Follow Up Assign to | Follow Up Type | Comment | Expected Date | Expected Amount
Filter labels: Add a photo
Actions: Reset Password · Log Out · Open WebCam · Remove Photo · Check in · Send WhatsApp Message · Place Order · See Follow Up History · View Participated Challenges · Freeze · Extension · DownGrade · Transfer · Upgrade · Upgrade To Combo Offer · Assign Personal Training · Renew Personal Training · Book a free Trial · Add Subscription · Renew Subscription · Assign Combo Offer · Submit · Add Follow up · Follow up Response · Back · Next

Form 2:
- [button] x
- **Send Notification**
- **[person]**
- **Notification**
  - Make sure your title is short and explanatory. · `noti_name` · text · required
- **Notification Body**
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea · required
- [button] Close
- [button] Send Notification

Form 3:
- [button] x
- **Add Workout**
- **[person]**
- **Weight**
  - Customer's Weight · `weight` · number · required
- **Height**
  - feet · `height_feet` · number · required
  - inch · `height_inch` · number · required
- **Customer's Goal**
- **Customer's Level**
- **Workout Plan**
  - `workout_plan` · select · options: Select Workout Plan
- **Workout Days**
  - Monday · `days_of_week` · checkbox · required
  - Tuesday · `days_of_week` · checkbox · required
  - Wednesday · `days_of_week` · checkbox · required
  - Thursday · `days_of_week` · checkbox · required
  - Friday · `days_of_week` · checkbox · required
  - Saturday · `days_of_week` · checkbox · required
  - Sunday · `days_of_week` · checkbox · required
- [button] Close
- [button] Assign Workout

Form 4:
- [button] x
- **Send Whatsapp Message**
- **[person]**
- **Message Body**
  - Enter a message that you want to send to customer. · `message_body` · textarea
- [button] Close
- [button] Send Message

Form 5:
- [button] x
- **Send Whatsapp Message**
- **[person]**
- **Message Body**
  - Enter a message that you want to send to customer. · `whatsapp_message_body` · textarea
- [button] Close
- [button] Send Message

Form 6:
- [button] x
- **[person]**
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew, 1 Month Strengthening (30 days), Group Training (31 days)
  - `renew_start_date` · text
- [button] Apply
- [button] Add more plan
  - Enter Member Code · `couple_cust_id` · text
- **Select A Batch**
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- [button] Close
- [button] Add Subscription

Form 7:
- [button] x
- **Freeze Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `freeze_membership_plan` · select · required · options: Select Subscription
  - dd-mm-yyyy · `freeze_start_date` · text
  - `freeze_days` · number · required
- **Freeze Subscription Fees**
  - Freeze for Days · `freeze_price` · text
  - Freeze for Days · `freeze_note` · text
- [button] Close
- [button] Freeze Subscription

Form 8:
- [button] x
- **Extend Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `extend_membership_plan` · select · required · options: Select Subscription, 1 Month Strengthening (07/09/2026 - 06/10/2026), Group Training (28/04/2023 - 28/05/2023)
- **Your Extension starts from the next day of selected Subscription End date**
  - `extend_days` · number · required
- **Extension Subscription Fees**
  - Freeze for Days · `extend_price` · text · required
  - Freeze for Days · `extendsion_note` · text
- [button] Close
- [button] Extend Subscription

Form 9:
- [button] x
- **Transfer Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `transfer_membership_plan` · select · required · options: Select Subscription
- **Transfer to**
  - Enter Member Code/Enquiry Code/Phone Number · `cust_id` · text · required
- **Joining Date**
  - `start_date` · text · required
  - End Date · `end_date` · text
- **Transfer Subscription Fees**
  - Freeze for Days · `transfer_price` · text
- [button] Close
- [button] Transfer Subscription

Form 10:
- [button] x
- **Upgrade Subscription**
- **[person]**
- **Subscription Selection**
  - Select Subscription · `sub_upgrade_membership_plan` · select · required · options: Select Subscription you wish to upgrade
  - Check Group to add subscription · `has_couple_check` · checkbox
- **Upgrade to Membership**
  - `upgrade_membership_plan` · select · required · options: {24 people/records}
- **Joining Date**
  - Start Date · `upgrade_start_date` · text · required
  - End Date · `upgrade_end_date` · text · required
- **Plan Price**
  - Base Price · `base_price` · text
  - Subscription Paid Price · `id_subscription_paid_price` · text
  - Sales Price · `sales_price` · text · required
- **Coupon Code**
  - Coupon Code · `upgrade_coupon_code` · text
- [button] Apply
- [button] Close
- [button] Upgrade Subscription

Form 11:
- [button] x
- **[person]**
- **Membership Selection**
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - Select Membership · `searchboxpt` · text · required
  - Search... · `membership_plan-0` · text
  - Select Trainer · `searchboxptt` · text · required
  - Search... · `trainer_trail_select-0` · text
  - `second_trainer_trail_select` · multiselect · options: {16 people/records}
  - `pt_points-0` · number · required · default 0
  - `pt_sessions-0` · number · required
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Yes · `devide_sessions_between_couple` · radio
  - No · `devide_sessions_between_couple` · radio
- **Make a Payment**
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code` · text
- [button] Apply Code
- **Select A Batch**
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- [button] Close
- [button] Add Subscription

Form 12:
- [button] x
- **Downgrade Subscription**
- **[person]**
- **Subscription Selection**
  - `downgrade_subscription` · select · required · options: Select Subscription
- **Downgrade to Membership**
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `membership_plan-0` · select · required · options: Please Select Subscription
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
- **Plan Price**
- **Previous Plan Paid Amount**
- **Refund Amount:**
- **Previous Plan Price:**
- **New Plan Price:**
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - Freeze for Days · `downgrade_note` · text
- [button] Close
- [button] Downgrade Subscription

Form 13:
- [button] x
- **Book a Trial**
- **[person]**
- **Membership Selection**
  - `membership_plan-0` · select · required · options: Select Membership, Free Trail - PT
  - `trainer_trail_select-0` · select · required · options: {17 people/records}
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `pt_sessions-0` · number · required
- **Make a Payment**
  - `plan_price-0` · text · required
- [button] Close
- [button] Add Subscription

Form 14:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number
- [button] Close
- [button] Add Member to Device

Form 15:
- [button] x
- **Delete Member from device**
- **[person]**
- [button] Close
- [button] Delete Member to Device

Form 16:
- [button] x
- **Activate Member from device**
- **[person]**
- [button] Close
- [button] Activate Member to Device

Form 17:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number
- **Notice**
- [button] Close
- [button] Add Member & Fingerprint

Form 18:
  - Add a photo · `center_logo` · file
- [button] x
- **Set Profile Picture**
- [button] Take Snapshot
- [button] Set As Profile Picture
- [button] Cancel
- [button] Open WebCam
- [button] Remove Photo
- **[person]**
- [button] Check in
- **[row value]**
- [button] Freeze
- [button] Extension
- [button] DownGrade
- [button] Transfer
- [button] Upgrade
- [button] Assign Personal Training
- [button] Renew Personal Training
- [button] Book a free Trial
- [button] Add Subscription
- [button] Renew Subscription
- **[row value]**
  - `my_followup_type` · select · options: All Followup, Membership Renewal, Enquiry, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Online Prospect(Non gym), Online Training, Trial Online PT, Trial Online PT Feedback, Nutrition, Other, Ex-Member, Ready To Sign Up, PT Follow-up, Demo Scheduled, Demo Conducted … (+2)
- [button] x
- **Schedule Follow Up**
- **... repeated once per row (10 rows on the page)**

Form 19:
- **Remarks**
  - `my_followup_type` · select · options: All Followup, Membership Renewal, Enquiry, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Online Prospect(Non gym), Online Training, Trial Online PT, Trial Online PT Feedback, Nutrition, Other, Ex-Member, Ready To Sign Up, PT Follow-up, Demo Scheduled, Demo Conducted … (+2)
- [button] x
- **Schedule Follow Up**
- **[person]**
- **Follow up Details**
- **[row value]**
- [button] Cancel
- [button] Confirm
- **Member Follow Up History**
- [button] See history
- [button] x
- **... repeated once per row (9 rows on the page)**

Form 20:
- [button] x
- **Schedule Follow Up**
  - `follow_up_type_` · select · options: Enquiry, Membership Renewal, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Referral, Transfer, Upgrade, Online Prospect(Non gym), Online Training, Trial Online PT, Trial Online PT Feedback, Nutrition, Massage, Other, Ex-Member, Ready To Sign Up … (+9)
  - Assign To * · `employee_select_` · select · options: {7 people/records}
  - Response * · `followup_response_` · select · required · options: Open Follow up, Successfull Follow up, Not Interested - Rates to high, Not Interested - Joined Another Gym, Not Interested - Wrong number, Not Interested - Relocated, Not Interested - other
  - Convertibility * · `lead_type_` · select · required · options: Hot, Warm / Maybe, Cold / Not so interested, Expected, Successfull Follow up, Unpitched
  - `expected_date_` · date
  - `expected_amt_` · number
  - Next Follow Up Date * · `followup_date_` · text
  - Contact Type * · `contact_type_` · select · required · options: Phone, In Person, Email, Whatsapp, SMS
  - To Do/Comment * · `followup_notes_` · textarea
  - `quick_msg` · select · options: Quick Message, Not reachable, No answer, Waiting, Busy, Incorrect, Interested, Switch Off, Call, JOINING CALL, COURTESY CALL, Call Again, JOINING CALL, COURTESY CALL, Inquired but did not ask for payment, Inquired & Payment link sent or to be sent., Call later same day or tomorrow or some other month, Costly Can not afford, Phone Cut, Half Call.Call again, Not Interested, Inquired by mistake, Joined Somewhere else, Other
- [button] Cancel
- [button] Confirm

Pop-up: **Send Notification** — buttons: Send Notification
  - Make sure your title is short and explanatory. · `noti_name` · text · required
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea · required

Pop-up: **Add Workout** — buttons: Create A Workout Plan, Assign Workout
  - Customer's Weight · `weight` · number · required
  - feet · `height_feet` · number · required
  - inch · `height_inch` · number · required
  - `workout_plan` · select · options: Select Workout Plan
  - Monday · `days_of_week` · checkbox · required
  - Tuesday · `days_of_week` · checkbox · required
  - Wednesday · `days_of_week` · checkbox · required
  - Thursday · `days_of_week` · checkbox · required
  - Friday · `days_of_week` · checkbox · required
  - Saturday · `days_of_week` · checkbox · required
  - Sunday · `days_of_week` · checkbox · required

Pop-up: **Send Whatsapp Message** — buttons: Send Message
  - Enter a message that you want to send to customer. · `message_body` · textarea

Pop-up: **SubscriptionModal** — buttons: Lookup Member code, Lookup Enquiry code, Add Subscription
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew, 1 Month Strengthening (30 days), Group Training (31 days)
  - `renew_start_date` · text
  - Select Membership · `searchbox` · text · required
  - Search... · `membership_plan-0` · text
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code-0` · text
  - Enter Member Code · `couple_cust_id` · text
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)

Pop-up: **Freeze Subscription** — buttons: Freeze Subscription
  - Select Membership · `freeze_membership_plan` · select · required · options: Select Subscription
  - dd-mm-yyyy · `freeze_start_date` · text
  - `freeze_days` · number · required
  - Freeze for Days · `freeze_price` · text
  - Freeze for Days · `freeze_note` · text

Pop-up: **Extend Subscription** — buttons: Extend Subscription
  - Select Membership · `extend_membership_plan` · select · required · options: Select Subscription, 1 Month Strengthening (07/09/2026 - 06/10/2026), Group Training (28/04/2023 - 28/05/2023)
  - `extend_days` · number · required
  - Freeze for Days · `extend_price` · text · required
  - Freeze for Days · `extendsion_note` · text

Pop-up: **Transfer Subscription** — buttons: Lookup Member code, Lookup Enquiry code, Transfer Subscription
  - Select Membership · `transfer_membership_plan` · select · required · options: Select Subscription
  - Enter Member Code/Enquiry Code/Phone Number · `cust_id` · text · required
  - `start_date` · text · required
  - End Date · `end_date` · text
  - Freeze for Days · `transfer_price` · text

Pop-up: **Upgrade Subscription** — buttons: Apply, Upgrade Subscription
  - Select Subscription · `sub_upgrade_membership_plan` · select · required · options: Select Subscription you wish to upgrade
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `upgrade_membership_plan` · select · required · options: {24 people/records}
  - Start Date · `upgrade_start_date` · text · required
  - End Date · `upgrade_end_date` · text · required
  - Base Price · `base_price` · text
  - Subscription Paid Price · `id_subscription_paid_price` · text
  - Sales Price · `sales_price` · text · required
  - Coupon Code · `upgrade_coupon_code` · text

Pop-up: **SubscriptionModall** — buttons: Lookup Member code, Lookup Enquiry code, Add Subscription
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - Select Membership · `searchboxpt` · text · required
  - Search... · `membership_plan-0` · text
  - Select Trainer · `searchboxptt` · text · required
  - Search... · `trainer_trail_select-0` · text
  - `second_trainer_trail_select` · multiselect · options: {16 people/records}
  - `pt_points-0` · number · required · default 0
  - `pt_sessions-0` · number · required
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Yes · `devide_sessions_between_couple` · radio
  - No · `devide_sessions_between_couple` · radio
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code` · text
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)

Pop-up: **Downgrade Subscription** — buttons: Downgrade Subscription
  - `downgrade_subscription` · select · required · options: Select Subscription
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `membership_plan-0` · select · required · options: Please Select Subscription
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - Freeze for Days · `downgrade_note` · text

Pop-up: **Book a Trial** — buttons: Add Subscription
  - `membership_plan-0` · select · required · options: Select Membership, Free Trail - PT
  - `trainer_trail_select-0` · select · required · options: {17 people/records}
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `pt_sessions-0` · number · required
  - `plan_price-0` · text · required

Pop-up: **Add Member to device** — buttons: Add Member to Device
  - `essl_code` · number · required
  - `rfid` · number

Pop-up: **Delete Member from device** — buttons: Delete Member to Device

Pop-up: **Activate Member from device** — buttons: Activate Member to Device

Pop-up: **Set Profile Picture** — buttons: Set As Profile Picture, Cancel

Pop-up: **Schedule Follow Up** — buttons: Cancel
  - `call_rep` · select · options: {8 people/records}
  - `followup_date` · text
  - Assign To * · `employee_select` · select · options: {7 people/records}
  - Convertibility * · `lead_type` · select · required · options: Hot, Warm / Maybe, Cold / Not so interested, Expected, Unpitched
  - `expected_date` · date
  - `expected_amt` · number
  - `followup_notes` · textarea
  - `quick_msg` · select · options: Quick Message, Not reachable, No answer, Waiting, Busy, Incorrect, Interested, Switch Off, Call, JOINING CALL, COURTESY CALL, Call Again, JOINING CALL, COURTESY CALL, Inquired but did not ask for payment, Inquired & Payment link sent or to be sent., Call later same day or tomorrow or some other month, Costly Can not afford, Phone Cut, Half Call.Call again, Not Interested, Inquired by mistake, Joined Somewhere else, Other
  - `contact_type` · select · required · options: Phone, In Person, Email, Whatsapp, SMS
  - `followup_comment` · textarea
  - `my_followup_type` · select · options: All Followup, Membership Renewal, Enquiry, Irregular Member, Balance due, Freeze, Assign Trial, Feedback, Measurement, PT Renewal, PT Trial, Commitment, Anniversary, Birthday, Online Prospect(Non gym), Online Training, Trial Online PT, Trial Online PT Feedback, Nutrition, Confirmation Calls, Gym/Studio Trial, Other

Opens: `/fitness-center/customer/basic-information/Customer-{id}/` · `/fitness-center/customer/Customer-{id}/` · `/fitness-center/customer/subscriptions/Customer-{id}/0/` · `/fitness-center/customer/attendance/Customer-{id}/0/ ` · `/fitness-center/customer/workout/Customer-{id}/0/` · `/fitness-center/customer/folloup-history/Customer-{id}/0/` · `/fitness-center/customer/client-form/Customer-{id}/0/` · `/fitness-center/customer/Referral-by/Customer-{id}/0/ ` · `/ecommerce/add-order/Customer-{id}` · `/app-challenge/challenge-list/Customer/{id}/` · `/merchant/fitness-center/upgrade-combo-offer-membership/Customer-{id}/` · `/merchant/fitness-center/combo-offer-membership/Customer-{id}/`

### Trainer Basic Information

`/fitness-center/trainer/basic-information/Trainer-{id}/`

Headings: Trainer Basic Information · Working Days · Trainer Services · Trainer Profile Picture · Trainer Coach App Settings · Trainer Address
Filter labels: Trainer Name * · Trainer Email * · Trainer Password * · Mobile Number* · Emergency Contact Number · Date of Birth * · Gender * · Trainer Experience · Trainer Client Limit · Show Trainer in App · Trainer Service Type · Employee Type * · Category* · Trainer Profile Picture * · Allow Workout in Coach App · Allow Diet in Coach App · Allow Followups in Coach App · Allow Appointments in Coach App · Assign Subscription · View Subscription · View Membership Plan · Create Membership Plan · View Programs · Create Programs · View All Batches · View Self Batches · Create Self Batches · Create All Batches · Address · City · State · Country · Pincode
Actions: Reset Password · Log Out · Back · Save & Next · Save

Form 2:
  - First name · `trainer_first_name` · text · required
  - Last name · `trainer_last_name` · text · required
  - [redacted] · `email` · text · required
  - ******* · `password` · password
  - `country_code` · text
  - [redacted] · `mobileNo` · text · required
  - [redacted] · `emergency_phone_no` · text
  - `dob` · text · required
  - Male · `gender` · radio · required
  - Female · `gender` · radio · required
  - Other · `gender` · radio · required
  - `trainer_experience` · number
  - `trainer_client_limit` · number
  - Yes · `show_in_app` · radio
  - No · `show_in_app` · radio
  - `trainer_service_type` · select · options: Both Online & Offline, Only Online, Only Offline
  - Head Trainer / Nutritionist · `tt_type` · radio
  - Personal Trainer · `tt_type` · radio · required
  - General Trainer · `tt_type` · radio
  - Doctor · `tt_type` · radio
  - Zumba Instructor · `tt_type` · radio
  - Coach · `tt_type` · radio
  - Nutritionist · `tt_type` · radio
  - Massage therapist · `tt_type` · radio
  - Fitness manager · `tt_type` · radio
  - Yoga instructor · `tt_type` · radio
  - Dietitian · `tt_type` · radio
  - Counsellor · `tt_type` · radio
  - Dance Choreographer · `tt_type` · radio
  - MMA Professional · `tt_type` · radio
  - Music Instructor · `tt_type` · radio
  - Physiotherapy · `tt_type` · radio
  - Psychology · `tt_type` · radio
  - S & C Coach · `tt_type` · radio
  - Senior Head Coach · `tt_type` · radio
  - Lead Coach · `tt_type` · radio · required
  - Group Fitness Coach · `tt_type` · radio
  - Postnatal Fitness Coach · `tt_type` · radio
  - CrossFit Coach · `tt_type` · radio
  - Personal Training and Nutrition Coach · `tt_type` · radio · required
  - Pilates Teacher · `tt_type` · radio · required
  - Freelancer · `tt_type` · radio · required
- **Working Days**
- **Trainer Services**
  - Weight Training · `fitness_category` · checkbox
  - Cardio · `fitness_category` · checkbox
  - Cross-fit · `fitness_category` · checkbox
  - Personal Training / Nutrition · `fitness_category` · checkbox
  - Calisthenics · `fitness_category` · checkbox
  - HIIT · `fitness_category` · checkbox
  - Strength Training · `fitness_category` · checkbox
  - Group Activity · `fitness_category` · checkbox
  - Nutrition · `fitness_category` · checkbox
  - Steam · `fitness_category` · checkbox
  - Locker · `fitness_category` · checkbox
  - Free Body Weight · `fitness_category` · checkbox
- **Trainer Profile Picture**
  - `trainer_pic` · file
- **Trainer Coach App Settings**
  - Yes · `allow_workout` · radio
  - No · `allow_workout` · radio
  - Yes · `allow_diet` · radio
  - No · `allow_diet` · radio
  - Yes · `allow_followups` · radio
  - No · `allow_followups` · radio
  - Yes · `allow_appointments` · radio
  - No · `allow_appointments` · radio
  - Yes · `assign_subscription` · radio
  - No · `assign_subscription` · radio
  - Yes · `view_subscription` · radio
  - No · `view_subscription` · radio
  - Yes · `view_membership_plan` · radio
  - No · `view_membership_plan` · radio
  - Yes · `create_membership_plan` · radio
  - No · `create_membership_plan` · radio
  - Yes · `view_programs` · radio
  - No · `view_programs` · radio
  - Yes · `create_programs` · radio
  - No · `create_programs` · radio
  - Yes · `view_all_batches` · radio
  - No · `view_all_batches` · radio
  - Yes · `view_self_batches` · radio
  - No · `view_self_batches` · radio
  - Yes · `create_self_batches` · radio
  - No · `create_self_batches` · radio
  - Yes · `create_all_batches` · radio
  - No · `create_all_batches` · radio
- **Trainer Address**
  - Flat No., Building name · `street1` · text
  - Street, Area · `street2` · text
  - `city` · text
  - `state` · text
  - `country` · text
  - `pincode` · number
- [button] Back
- [button] Save & Next
- [button] Save

Opens: `/fitness-center/trainer/payroll-commission/Trainer-{id}/`

### Trainer : [person] Details

`/fitness-center/trainer/profile-view/Trainer-{id}/`

Headings: Trainer : [person] Details · [person] · Trainer Details · Emergency Contact Details · Additional Details · Perform Biometric Device Operations For Trainers · Daily Trainer Attendance · Trainer Awards · Trainer Certificate · Community
Columns: Device Name, Type | Device Serial
Columns: Checked In At | Checked Out At | Fitness Center
Actions: Reset Password · Log Out · Clients List · Referral-by · Add User · Re-Add User · Delete User · Un-Block User · Block User · Delete Attendance

Form 2:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- [button] Close
- [button] Add Member to Device

Form 3:
- [button] x
- **Delete Member from device**
- **[person]**
- [button] Close
- [button] Delete Member to Device

Form 4:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- **Notice**
- [button] Close
- [button] Add Member & Fingerprint

Form 5:
- [button] x
- **Add Member to device Face**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- **Notice**
- [button] Close
- [button] Add Member & Face

Form 6:
- [button] x
- **ADD TRAINER TO REGISTER FACE IN DEVICE**
- **[person]**
  - Finger · `timmy_command_type` · radio · required
  - Face · `timmy_command_type` · radio
  - Card · `timmy_command_type` · radio
  - `timmy_device_list` · select · required · options: Select Devices
- [button] Close
- [button] Add User To Fingerprint Device

Form 7:
- [button] x
- **ADD TRAINER TO REGISTER FACE IN DEVICE**
- **[person]**
  - `auth_user_id` · text
  - `user_name` · text
  - Finger · `zk_command_type` · radio · required
- [button] Close
- [button] Add Trainer To Fingerprint Device

Form 8:
- [button] x
- **ADD USER TO ESSL DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Add User To Biometric Device

Form 9:
- [button] x
- **BLOCK USER FROM ESSL DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Block User From Device

Form 10:
- [button] x
- **UN-BLOCK USER FROM ESSL DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Un-Block User From Device

Form 11:
- [button] x
- **SYNC TRAINER TO ESSL DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
- [button] Close
- [button] Sync User To Biometric Device

Form 12:
- [button] x
- **DELETE TRAINER FROM ESSL DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Delete User From Device

Form 13:
- [button] x
- **RE-ENROLL USER TO ESSL DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Enroll User To Biometric Device

Form 14:
- [button] x
- **Add Member to Etime Device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number
- **Notice**
- [button] Close
- [button] Add Fingerprint

Form 15:
- [button] x
- **ADD TRAINER TO VITAL DEVICE**
- **[person]**
  - `device_list` · select · required · options: 
  - `device_ou_id` · select · required · options: 
- [button] Close
- [button] Add User To Vital Device

Form 16:
- **Trainer : [person] Details**
- **[person]**
- [button] x
- **Clients List**
- [button] Cancel
- **Trainer Details**
- **Emergency Contact Details**
- **Additional Details**
- **Perform Biometric Device Operations For Trainers**
- [button] Add User
- [button] Re-Add User
- [button] Delete User
- [button] Un-Block User
- [button] Block User
- **Daily Trainer Attendance**
- [button] Delete Attendance
  - `check-all-box` · checkbox
- **Trainer Awards**
- **Trainer Certificate**
- **Community**
- [button] x
- **Followers List**
- [button] Cancel
- [button] x
- **Following List**
- [button] Cancel

Pop-up: **Add Member to device** — buttons: Add Member to Device
  - `essl_code` · number · required
  - `rfid` · number · default None

Pop-up: **Delete Member from device** — buttons: Delete Member to Device

Pop-up: **Add Member to device Face** — buttons: Add Member & Face
  - `essl_code` · number · required
  - `rfid` · number · default None

Pop-up: **ADD TRAINER TO REGISTER FACE IN DEVICE** — buttons: Add User To Fingerprint Device
  - Finger · `timmy_command_type` · radio · required
  - Face · `timmy_command_type` · radio
  - Card · `timmy_command_type` · radio
  - `timmy_device_list` · select · required · options: Select Devices

Pop-up: **ADD USER TO ESSL DEVICE (NEW)** — buttons: Add User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **BLOCK USER FROM ESSL DEVICE (NEW)** — buttons: Block User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **UN-BLOCK USER FROM ESSL DEVICE (NEW)** — buttons: Un-Block User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **SYNC TRAINER TO ESSL DEVICE (NEW)** — buttons: Sync User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list[]` · checkbox · required

Pop-up: **DELETE TRAINER FROM ESSL DEVICE (NEW)** — buttons: Delete User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **RE-ENROLL USER TO ESSL DEVICE (NEW)** — buttons: Enroll User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **Add Member to Etime Device** — buttons: Add Fingerprint
  - `essl_code` · number · required
  - `rfid` · number

Pop-up: **ADD TRAINER TO VITAL DEVICE** — buttons: Add User To Vital Device
  - `device_list` · select · required · options: 
  - `device_ou_id` · select · required · options: 

Pop-up: **Clients List** — buttons: Cancel

Pop-up: **Followers List** — buttons: Cancel

Pop-up: **Following List** — buttons: Cancel

Opens: `/fitness-center/customer/Customer-{id}/` · `/fitness-center/trainer/Referral-by/Trainer-{id}/` · `/fitness-center/trainer/profile-view/Trainer-{id}/` · `/fitness-center/trainer/check-attendance/Trainer-{id}/` · `/fitness-center/trainer/missed-attendance/Trainer-{id}/` · `/community/post-view/{id}/`

### Fitness Center Preview

`/fitness-center/Fitness-Center-{id}/`

Headings: Fitness Center Preview · Basic Information · About Us · Services · Integration API KEY · Contact Information · Fitness Center Contact Details · Manager Contact Details · Opening Hours · Address & Location · Address · Community
Columns: Day of week | Session 1 | Session 2 | Session 3 | Monday ( Open )
Filter labels: Upload Cover Photo · Upload Logo
Actions: Reset Password · Log Out · Add Exercise · Add Membership Plan · Add Rules · Feedback · QR Code Generator · Begin Marketing · Build My Website

Form 2:
  - Upload Cover Photo · `center_coverpic` · file
  - Upload Logo · `center_logo` · file
- [button] QR Code Generator
- **Basic Information**
- **About Us**
- **Services**
- **Integration API KEY**
- **Contact Information**
- **Fitness Center Contact Details**
- **Manager Contact Details**
- **Opening Hours**
- **Address & Location**
- **Address**
- **Community**
- **Quick Stats**
- **Social Media Marketing**
- **Website Development**

Opens: `/fitness-center/basic-information/Fitness-Center-{id}/` · `/fitness-center/important-people/Fitness-Center-{id}/` · `/fitness-center/center-timings/Fitness-Center-{id}/` · `/fitness-center/address-location/Fitness-Center-{id}/`

### Fitness CenterBasic Information

`/fitness-center/basic-information/Fitness-Center-{id}/`

Headings: Fitness CenterBasic Information · Fitness center category · Fitness center facilities · Fitness center Capacity · Contact information
Filter labels: Fitness Center Name * · Tag Line · Fitness Center Description · Fitness Center Category* · Custom Categories* · Fitness Center Facilities* · Fitness Center Capacity * · Fitness Center Email * · Mobile Number * · Toll Free/Landline Number
Actions: Reset Password · Log Out · Cancel · Save & Next · Save

Form 2:
  - Fitness Center Name * · `center_name` · text · required
  - Make sure your tag line is catchy. e.g. Forever fit, forever strong!. · `tag_line` · text
  - Fitness Center Description · `center_description` · textarea
- **Fitness center category**
  - Weight Training · `fitness_category` · checkbox
  - Yoga · `fitness_category` · checkbox
  - Cardio · `fitness_category` · checkbox
  - Cross-fit · `fitness_category` · checkbox
  - Zumba · `fitness_category` · checkbox
  - Personal Training / Nutrition · `fitness_category` · checkbox
  - Dance · `fitness_category` · checkbox
  - Body Massage · `fitness_category` · checkbox
  - Kick Boxing · `fitness_category` · checkbox
  - Calisthenics · `fitness_category` · checkbox
  - HIIT · `fitness_category` · checkbox
  - Strength Training · `fitness_category` · checkbox
  - MMA · `fitness_category` · checkbox
  - Group Activity · `fitness_category` · checkbox
  - Spinning · `fitness_category` · checkbox
  - Nutrition · `fitness_category` · checkbox
  - Physiotherapy · `fitness_category` · checkbox
  - Steam · `fitness_category` · checkbox
  - Locker · `fitness_category` · checkbox
  - Boxing · `fitness_category` · checkbox
  - Sauna · `fitness_category` · checkbox
  - Free Body Weight · `fitness_category` · checkbox
  - Pilates (Group) · `fitness_category` · checkbox
  - Pilates (Private) · `fitness_category` · checkbox
- **Fitness center facilities**
  - Locker · `fitness_facilities` · checkbox
  - Shower · `fitness_facilities` · checkbox
  - Training · `fitness_facilities` · checkbox
  - Steam · `fitness_facilities` · checkbox
  - Sauna · `fitness_facilities` · checkbox
  - Valet Parking · `fitness_facilities` · checkbox
  - Wifi · `fitness_facilities` · checkbox
  - Cafe · `fitness_facilities` · checkbox
  - Toilet · `fitness_facilities` · checkbox
  - Biometric · `fitness_facilities` · checkbox
  - Changing Room · `fitness_facilities` · checkbox
  - Pantry · `fitness_facilities` · checkbox
  - Separate weight loss · `fitness_facilities` · checkbox
  - Cardio Training area · `fitness_facilities` · checkbox
  - Fat Loss · `fitness_facilities` · checkbox
  - Weight Loss · `fitness_facilities` · checkbox
  - Weight Gain · `fitness_facilities` · checkbox
  - Cardio · `fitness_facilities` · checkbox
  - Strength Training · `fitness_facilities` · checkbox
  - Natural Bodybuilding · `fitness_facilities` · checkbox
  - Injury Rehab · `fitness_facilities` · checkbox
  - Weight Training · `fitness_facilities` · checkbox
  - Crossfit Workout · `fitness_facilities` · checkbox
  - Calisthenics · `fitness_facilities` · checkbox
  - Special Population Training · `fitness_facilities` · checkbox
  - Nutrition Counselling · `fitness_facilities` · checkbox
  - Transformation Plans · `fitness_facilities` · checkbox
- **Fitness center Capacity**
  - How many members does your gym accomodate at a time? · `gym_capacity` · number · required · default 20
- **Contact information**
  - `email` · email · required
  - `mobile` · text · required
  - `landline` · number
- [button] Cancel
- [button] Save & Next
- [button] Save

Opens: `/fitness-center/address-location/Fitness-Center-{id}/` · `/fitness-center/center-timings/Fitness-Center-{id}/` · `/fitness-center/important-people/Fitness-Center-{id}/`

### Staff : [person] Details

`/merchant/fitness-centers/accounts-view/owner_{id}/`

Headings: Staff : [person] Details · [person] · Staff Details · Perform Biometric Device Operations For Staff Members · Daily Staff Attendance
Columns: Device Name, Type | Device Serial
Columns: Checked In At | Checked Out At | Fitness Center
Actions: Reset Password · Log Out · Add User · Re-Add User · Delete User · Un-Block User · Block User · Delete Attendance

Form 2:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number
- [button] Close
- [button] Add Member to Device

Form 3:
- [button] x
- **Delete Member from device**
- **[person]**
- [button] Close
- [button] Delete Member to Device

Form 4:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number
- **Notice**
- [button] Close
- [button] Add Member & Fingerprint

Form 5:
- [button] x
- **Add Member to device Face**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number
- **Notice**
- [button] Close
- [button] Add Member & Face

Form 6:
- [button] x
- **ADD STAFF TO REGISTER FACE IN DEVICE**
- **[person]**
  - Finger · `timmy_command_type` · radio · required
  - Face · `timmy_command_type` · radio
  - Card · `timmy_command_type` · radio
  - `timmy_device_list` · select · required · options: Select Devices
- [button] Close
- [button] Add User To Fingerprint Device

Form 7:
- [button] x
- **ADD STAFF TO REGISTER FACE IN DEVICE**
- **[person]**
  - `auth_user_id` · text
  - `user_name` · text
  - Finger · `zk_command_type` · radio · required
- [button] Close
- [button] Add Staff Fingerprint To ZKTeco Device

Form 8:
- [button] x
- **ADD STAFF TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Add User To Biometric Device

Form 9:
- [button] x
- **BLOCK USER FROM ESSL DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Block User From Device

Form 10:
- [button] x
- **UN-BLOCK USER FROM ESSL DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Un-Block User From Device

Form 11:
- [button] x
- **RE-ENROLL STAFF TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Enroll User To Biometric Device

Form 12:
- [button] x
- **DELETE STAFF FROM ESSL DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Delete User From Device

Form 13:
- [button] x
- **SYNC STAFF TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
- [button] Close
- [button] Sync User To Biometric Device

Form 14:
- [button] x
- **Add Member to Etime Device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number
- **Notice**
- [button] Close
- [button] Add Fingerprint

Form 15:
- [button] x
- **ADD STAFF TO VITAL DEVICE**
- **[person]**
  - `device_list` · select · required · options: 
  - `device_ou_id` · select · required · options: 
- [button] Close
- [button] Add User To Vital Device

Form 16:
- **Staff : [person] Details**
- **[person]**
- **Staff Details**
- **Perform Biometric Device Operations For Staff Members**
- [button] Add User
- [button] Re-Add User
- [button] Delete User
- [button] Un-Block User
- [button] Block User
- **Daily Staff Attendance**
- [button] Delete Attendance
  - `check-all-box` · checkbox

Pop-up: **Add Member to device** — buttons: Add Member to Device
  - `essl_code` · number · required
  - `rfid` · number

Pop-up: **Delete Member from device** — buttons: Delete Member to Device

Pop-up: **Add Member to device Face** — buttons: Add Member & Face
  - `essl_code` · number · required
  - `rfid` · number

Pop-up: **ADD STAFF TO REGISTER FACE IN DEVICE** — buttons: Add User To Fingerprint Device
  - Finger · `timmy_command_type` · radio · required
  - Face · `timmy_command_type` · radio
  - Card · `timmy_command_type` · radio
  - `timmy_device_list` · select · required · options: Select Devices

Pop-up: **ADD STAFF TO BIOMETRIC DEVICE (NEW)** — buttons: Add User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **BLOCK USER FROM ESSL DEVICE (NEW)** — buttons: Block User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **UN-BLOCK USER FROM ESSL DEVICE (NEW)** — buttons: Un-Block User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **RE-ENROLL STAFF TO BIOMETRIC DEVICE (NEW)** — buttons: Enroll User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **DELETE STAFF FROM ESSL DEVICE (NEW)** — buttons: Delete User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **SYNC STAFF TO BIOMETRIC DEVICE (NEW)** — buttons: Sync User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list[]` · checkbox · required

Pop-up: **Add Member to Etime Device** — buttons: Add Fingerprint
  - `essl_code` · number · required
  - `rfid` · number

Pop-up: **ADD STAFF TO VITAL DEVICE** — buttons: Add User To Vital Device
  - `device_list` · select · required · options: 
  - `device_ou_id` · select · required · options: 

Opens: `/merchant/fitness-centers/accounts-view/owner_{id}/` · `/merchant/fitness-centers/staff/check-attendance/owner_{id}/` · `/merchant/fitness-centers/staff/missed-attendance/owner_{id}/`

### Staff Account Basic Information

`/fitness-center/account/basic-information/Owner-{id}/`

Headings: Staff Account Basic Information · Allowed Fitness Centers · Allowed Ecommerce Stores · Working Days · Staff Profile Picture · Staff Payroll · Account Address
Filter labels: Staff Name * · Staff Email * · Staff Password * · Mobile Number * · Emergency Contact Number · Date of Birth * · Gender * · Employee Type * · Designation * · Allow Discounting * · Can see only his clients * · Auto Allocate Leads * · Fitness Centers* · Stores* · Staff Profile Picture * · Basic Pay/Salary · Deduct Salary for absent · Late Penalty · Address · City · State · Country · Pincode
Actions: Reset Password · Log Out · Back · Save & Close · Save

Form 2:
  - First name · `account_first_name` · text · required
  - Last name · `account_last_name` · text · required
  - [redacted] · `email` · text · required
  - ******* · `password` · password
  - `country_code` · text
  - [redacted] · `mobileNo ` · text · required
  - [redacted] · `emergency_phone_no` · text
  - `dob` · text · required
  - Male · `gender` · radio · required
  - Female · `gender` · radio · required
  - Other · `gender` · radio · required
  - Owner · `ac_type` · radio · required
  - Manager/General Manager · `ac_type` · radio · required
  - Floor Manager/Fitness Manager · `ac_type` · radio · required
  - Admin · `ac_type` · radio · required
  - Sales · `ac_type` · radio · required
  - Front Desk Executive · `ac_type` · radio · required
  - Support Staff/Helper · `ac_type` · radio · required
  - Sales Manager · `ac_type` · radio · required
  - HR · `ac_type` · radio · required
  - [person] · `staff_des` · radio
  - [person] · `staff_des` · radio
  - [person] · `staff_des` · radio
  - [person] · `staff_des` · radio
  - [person] · `staff_des` · radio
  - [person] · `staff_des` · radio
  - [person] · `staff_des` · radio
  - Yes · `allow_discounting` · radio
  - No · `allow_discounting` · radio
  - Yes · `only_his_clients` · radio
  - No · `only_his_clients` · radio
  - Yes · `auto_lead_clients` · radio
  - No · `auto_lead_clients` · radio
- **Allowed Fitness Centers**
  - Shaan Fitness Gym · `allow_fitness_center` · checkbox
- **Allowed Ecommerce Stores**
  - Nutra Sage · `allow_fitness_stores` · checkbox
- **Working Days**
- **Staff Profile Picture**
  - `trainer_pic` · file
- **Staff Payroll**
  - `basic_pay` · number · default 8000.00
  - `pay_acc_to_duration` · select · options: Per Month, Per Week, Per Day
  - Deduct Salary for Absent · `deducted_salary_for_absent` · checkbox
  - `late_penalty_amt` · number · default 0.00
- **Account Address**
  - Flat No., Building name · `street1` · text
  - Street, Area · `street2` · text
  - `city` · text
  - `state` · text
  - `country` · text
  - `pincode` · number
- [button] Back
- [button] Save & Close
- [button] Save

### Staff : [person] Details

`/merchant/fitness-centers/accounts-view/Owner-{id}/`

Headings: Staff : [person] Details · [person] · Staff Details · Perform Biometric Device Operations For Staff Members · Daily Staff Attendance
Columns: Device Name, Type | Device Serial
Columns: Checked In At | Checked Out At | Fitness Center
Actions: Reset Password · Log Out · Add User · Re-Add User · Delete User · Un-Block User · Block User · Delete Attendance

Form 2:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number
- [button] Close
- [button] Add Member to Device

Form 3:
- [button] x
- **Delete Member from device**
- **[person]**
- [button] Close
- [button] Delete Member to Device

Form 4:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number
- **Notice**
- [button] Close
- [button] Add Member & Fingerprint

Form 5:
- [button] x
- **Add Member to device Face**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number
- **Notice**
- [button] Close
- [button] Add Member & Face

Form 6:
- [button] x
- **ADD STAFF TO REGISTER FACE IN DEVICE**
- **[person]**
  - Finger · `timmy_command_type` · radio · required
  - Face · `timmy_command_type` · radio
  - Card · `timmy_command_type` · radio
  - `timmy_device_list` · select · required · options: Select Devices
- [button] Close
- [button] Add User To Fingerprint Device

Form 7:
- [button] x
- **ADD STAFF TO REGISTER FACE IN DEVICE**
- **[person]**
  - `auth_user_id` · text
  - `user_name` · text
  - Finger · `zk_command_type` · radio · required
- [button] Close
- [button] Add Staff Fingerprint To ZKTeco Device

Form 8:
- [button] x
- **ADD STAFF TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Add User To Biometric Device

Form 9:
- [button] x
- **BLOCK USER FROM ESSL DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Block User From Device

Form 10:
- [button] x
- **UN-BLOCK USER FROM ESSL DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Un-Block User From Device

Form 11:
- [button] x
- **RE-ENROLL STAFF TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Enroll User To Biometric Device

Form 12:
- [button] x
- **DELETE STAFF FROM ESSL DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Delete User From Device

Form 13:
- [button] x
- **SYNC STAFF TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
- [button] Close
- [button] Sync User To Biometric Device

Form 14:
- [button] x
- **Add Member to Etime Device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number
- **Notice**
- [button] Close
- [button] Add Fingerprint

Form 15:
- [button] x
- **ADD STAFF TO VITAL DEVICE**
- **[person]**
  - `device_list` · select · required · options: 
  - `device_ou_id` · select · required · options: 
- [button] Close
- [button] Add User To Vital Device

Form 16:
- **Staff : [person] Details**
- **[person]**
- **Staff Details**
- **Perform Biometric Device Operations For Staff Members**
- [button] Add User
- [button] Re-Add User
- [button] Delete User
- [button] Un-Block User
- [button] Block User
- **Daily Staff Attendance**
- [button] Delete Attendance
  - `check-all-box` · checkbox

Pop-up: **Add Member to device** — buttons: Add Member to Device
  - `essl_code` · number · required
  - `rfid` · number

Pop-up: **Delete Member from device** — buttons: Delete Member to Device

Pop-up: **Add Member to device Face** — buttons: Add Member & Face
  - `essl_code` · number · required
  - `rfid` · number

Pop-up: **ADD STAFF TO REGISTER FACE IN DEVICE** — buttons: Add User To Fingerprint Device
  - Finger · `timmy_command_type` · radio · required
  - Face · `timmy_command_type` · radio
  - Card · `timmy_command_type` · radio
  - `timmy_device_list` · select · required · options: Select Devices

Pop-up: **ADD STAFF TO BIOMETRIC DEVICE (NEW)** — buttons: Add User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **BLOCK USER FROM ESSL DEVICE (NEW)** — buttons: Block User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **UN-BLOCK USER FROM ESSL DEVICE (NEW)** — buttons: Un-Block User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **RE-ENROLL STAFF TO BIOMETRIC DEVICE (NEW)** — buttons: Enroll User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **DELETE STAFF FROM ESSL DEVICE (NEW)** — buttons: Delete User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **SYNC STAFF TO BIOMETRIC DEVICE (NEW)** — buttons: Sync User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list[]` · checkbox · required

Pop-up: **Add Member to Etime Device** — buttons: Add Fingerprint
  - `essl_code` · number · required
  - `rfid` · number

Pop-up: **ADD STAFF TO VITAL DEVICE** — buttons: Add User To Vital Device
  - `device_list` · select · required · options: 
  - `device_ou_id` · select · required · options: 

Opens: `/merchant/fitness-centers/accounts-view/Owner-{id}/` · `/merchant/fitness-centers/staff/check-attendance/Owner-{id}/` · `/merchant/fitness-centers/staff/missed-attendance/Owner-{id}/`

### [person]

`/fitness-center/customer/Customer-{id}/0/`

Headings: [person] · Membership Actions · Perform Biometric Device Operations For Customer · Member Subscriptions · Active & Expired Subscriptions · Medical History · Medical Details · . · Basic Information · Member Details · Emergency Contact Details · Additional Details
Columns: # | Membership Plan | Start Date | End Date | Base Price | Selling Price | Apply Coupon | Action
Columns: Device Name, Type | Device Serial
Columns: # | Membership name | Category | Start Date | End Date | Price | Membership Status | Payment Status | Action | 1
Filter labels: Add a photo
Actions: Reset Password · Log Out · Open WebCam · Remove Photo · Check Out · Send WhatsApp Message · Place Order · See Follow Up History · View Participated Challenges · Freeze · Extension · DownGrade · Transfer · Upgrade · Upgrade To Combo Offer · Assign Personal Training · Renew Personal Training · Book a free Trial · Add Subscription · Renew Subscription · Assign Combo Offer · Add User · Re-Add User · Unblock User · Block User

Form 2:
- [button] x
- **Send Notification**
- **[person]**
- **Notification**
  - Make sure your title is short and explanatory. · `noti_name` · text · required
- **Notification Body**
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea · required
- [button] Close
- [button] Send Notification

Form 3:
- [button] x
- **Add Workout**
- **[person]**
- **Weight**
  - Customer's Weight · `weight` · number · required
- **Height**
  - feet · `height_feet` · number · required
  - inch · `height_inch` · number · required
- **Customer's Goal**
  - Fat Loss · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Weight Gain · `goals` · radio · required
  - General Fitness · `goals` · radio · required
  - Over all fitness · `goals` · radio · required
  - Sports Specific · `goals` · radio · required
  - Marathon Training · `goals` · radio · required
  - Lean Toning · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Strength building · `goals` · radio · required
  - Calisthenics · `goals` · radio · required
  - Stamina building · `goals` · radio · required
  - Maintain Weight · `goals` · radio · required
  - Sports specific purpose · `goals` · radio · required
  - Sports Specific Purpose · `goals` · radio · required
  - Active Rest Cardio · `goals` · radio · required
  - Deep Fasting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Maintain whole body · `goals` · radio · required
  - intense · `goals` · radio · required
  - body element · `goals` · radio · required
  - Body Toning · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Motivate to doing Workout · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Mental Health · `goals` · radio · required
  - begginer · `goals` · radio · required
  - basic course · `goals` · radio · required
  - Fat Loss + Testosterone Boost + T3 & T4 Improvement · `goals` · radio · required
  - immunity · `goals` · radio · required
  - home workout · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - Pain Management · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Improve posture · `goals` · radio · required
  - Body Tone · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Weight gain · `goals` · radio · required
  - Strength boosting · `goals` · radio · required
  - Stiff Shoulder · `goals` · radio · required
  - Increase football skills · `goals` · radio · required
  - yoga · `goals` · radio · required
  - Massage · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve strength · `goals` · radio · required
  - Muscle Endurance · `goals` · radio · required
  - strength · `goals` · radio · required
  - improve Muscle blood flow · `goals` · radio · required
  - Full Body Energizer · `goals` · radio · required
  - Sports specific · `goals` · radio · required
  - Performance · `goals` · radio · required
  - Shoulder Rehab · `goals` · radio · required
  - circuit training · `goals` · radio · required
  - Core conditioning · `goals` · radio · required
  - abc · `goals` · radio · required
  - Rehab Programme · `goals` · radio · required
  - Problem · `goals` · radio · required
  - fat loss · `goals` · radio · required
  - Back problem · `goals` · radio · required
  - demo · `goals` · radio · required
  - improve balance · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Improve time · `goals` · radio · required
  - Aerobic base · `goals` · radio · required
  - Heart rate · `goals` · radio · required
  - Rehab · `goals` · radio · required
  - Inch loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - strength training · `goals` · radio · required
  - Running · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - fat loss,muscle tune · `goals` · radio · required
  - strength and size gain · `goals` · radio · required
  - muscle gain, fat loss · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - muscle gain · `goals` · radio · required
  - fat loss , weight gain , mussscle build · `goals` · radio · required
  - marathon · `goals` · radio · required
  - marathon · `goals` · radio · required
  - Marathon · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Fat loss muscle gain · `goals` · radio · required
  - diabetic management · `goals` · radio · required
  - diabetic diet plan · `goals` · radio · required
  - Postural training · `goals` · radio · required
  - Awareness · `goals` · radio · required
  - increase bench press capacity · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Toning · `goals` · radio · required
  - Muscle gain & Fat loss · `goals` · radio · required
  - STRENGTHENING · `goals` · radio · required
  - MOBILITY & JOINT CONDITION · `goals` · radio · required
  - RELAX MUSCLE · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Power lifting · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - Kidney · `goals` · radio · required
  - Yoga Satvik Diet plan · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve Flexibility · `goals` · radio · required
  - Overall health and immunity · `goals` · radio · required
  - Injury rehabilitation · `goals` · radio · required
  - Build Body strength · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Diabetes · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Muscle Gain N Toning · `goals` · radio · required
  - Build Strength Endurance · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - peak week · `goals` · radio · required
  - TRANSFORMATION · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Building abs · `goals` · radio · required
  - foundation · `goals` · radio · required
  - Muscle building · `goals` · radio · required
  - self defense level 1 · `goals` · radio · required
  - FAT LOSS · `goals` · radio · required
  - Muscular Endurance and Stamina · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Building abs · `goals` · radio · required
  - acting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - general · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Overall Health Immunity and Fatloss · `goals` · radio · required
  - Overall Health and Lean Muscle Gain · `goals` · radio · required
  - fitness · `goals` · radio · required
  - Mental health · `goals` · radio · required
  - Detoxify the body · `goals` · radio · required
  - increase speed · `goals` · radio · required
  - Strength and stamina increase, Fatloss · `goals` · radio · required
  - weight gain · `goals` · radio · required
  - Fat Loss N Toning · `goals` · radio · required
  - Pain management · `goals` · radio · required
  - Improve muscular strength · `goals` · radio · required
  - Improve joint range of motion · `goals` · radio · required
  - home program · `goals` · radio · required
  - Pain Control · `goals` · radio · required
  - Improve Joint ROM · `goals` · radio · required
  - Improve Muscle Power · `goals` · radio · required
  - Improve Balance & Coordination · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Improve Breathing capacity · `goals` · radio · required
  - Improve ADL · `goals` · radio · required
  - Fat Loss · `goals` · radio · required
  - Calf moulding · `goals` · radio · required
  - lean muscle fatloss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - increase height · `goals` · radio · required
  - increase height · `goals` · radio · required
  - Recomposition · `goals` · radio · required
  - Wight loss & muscle gain · `goals` · radio · required
  - Body Conditioning · `goals` · radio · required
  - Transform · `goals` · radio · required
  - Get Started · `goals` · radio · required
  - Knee Pain Senior citizens · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - bb · `goals` · radio · required
  - Super Transformation · `goals` · radio · required
  - beginner · `goals` · radio · required
  - beginner · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - strength build-up & toning · `goals` · radio · required
  - for normal delivery · `goals` · radio · required
  - warm muscles and joints · `goals` · radio · required
  - Fat loss muscle building · `goals` · radio · required
  - Toning 1.1 ( Resistance Band) · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Lean Muscle & Toning · `goals` · radio · required
  - Fat Loss & Improve overall Health · `goals` · radio · required
  - Lean & Photoshoot Ready Physique · `goals` · radio · required
  - Strength Building & Improve HM Timing · `goals` · radio · required
  - Fat loss & Lean physique · `goals` · radio · required
  - Full body · `goals` · radio · required
  - Weight loss & toning · `goals` · radio · required
  - new · `goals` · radio · required
  - Diabetes Diet Plan · `goals` · radio · required
  - lunch capacity enhance · `goals` · radio · required
  - Weight Loss & Fat Loss · `goals` · radio · required
  - Build Strength · `goals` · radio · required
  - Fat Loss & Beach Ready · `goals` · radio · required
  - - · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Fat Loss · `goals` · radio · required
  - Weight Loss / Fat Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - WEIGHT LOSS · `goals` · radio · required
  - Weight Loss & General Fitness · `goals` · radio · required
  - Strength Building and Marathon Training · `goals` · radio · required
  - Strength Building and Train for Ultra 50K · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Fat Loss and Wellness · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - BODY RECOMPOSITION · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - massive gan · `goals` · radio · required
  - detoxification · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Increasing Power · `goals` · radio · required
  - Functional training · `goals` · radio · required
  - Daily Movement · `goals` · radio · required
  - Weight Lose · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Lean Mass · `goals` · radio · required
  - Warm Up · `goals` · radio · required
  - Lean Mass · `goals` · radio · required
  - Lean mass · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - healthy lifestyle · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Recomposition · `goals` · radio · required
  - Toning · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss and Muscle gain · `goals` · radio · required
  - Lean mass · `goals` · radio · required
  - Lower Body · `goals` · radio · required
  - ABS · `goals` · radio · required
  - increase stamina · `goals` · radio · required
  - get fit · `goals` · radio · required
  - Weight Loss 1.2K · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - HYPERTROPHY · `goals` · radio · required
  - 1st Prep · `goals` · radio · required
  - height gain · `goals` · radio · required
  - build muscle, increasing mobility and flexibility. · `goals` · radio · required
  - Warm Up · `goals` · radio · required
  - Recovery · `goals` · radio · required
  - Maintain fitness · `goals` · radio · required

Form 4:
- [button] x
- **Send Whatsapp Message**
- **[person]**
- **Message Body**
  - Enter a message that you want to send to customer. · `message_body` · textarea
- [button] Close
- [button] Send Message

Form 5:
- [button] x
- **Send Whatsapp Message**
- **[person]**
- **Message Body**
  - Enter a message that you want to send to customer. · `whatsapp_message_body` · textarea
- [button] Close
- [button] Send Message

Form 6:
- [button] x
- **[person]**
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew, 6 Months Strengthening (Incl. Cardio) (180 days)
  - `renew_start_date` · text
- [button] Apply
- [button] Add more plan
  - Enter Member Code · `couple_cust_id` · text
- **Select A Batch**
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- [button] Close
- [button] Add Subscription

Form 7:
- [button] x
- **Medical History**
- **[person]**
  - Yes · `heart_problem` · radio · required
  - No · `heart_problem` · radio · required
  - Yes · `diabetes` · radio · required
  - No · `diabetes` · radio · required
  - Yes · `chest_pain_while_exercise` · radio · required
  - No · `chest_pain_while_exercise` · radio · required
  - Yes · `feel_faint` · radio · required
  - No · `feel_faint` · radio · required
  - Yes · `back_pain_or_joints_pain` · radio · required
  - No · `back_pain_or_joints_pain` · radio · required
  - Yes · `asthma` · radio · required
  - No · `asthma` · radio · required
  - Yes · `medication` · radio · required
  - No · `medication` · radio · required
  - Yes · `any_surgery` · radio · required
  - No · `any_surgery` · radio · required
  - Yes · `any_reason_to_modify_exercise` · radio · required
  - No · `any_reason_to_modify_exercise` · radio · required
  - Yes · `pregnant` · radio · required
  - No · `pregnant` · radio · required
  - Yes · `allergies` · radio · required
  - No · `allergies` · radio · required
  - Yes · `medical_problem` · radio · required
  - No · `medical_problem` · radio · required
  - `medical_note` · textarea
- [button] Close
- [button] Save

Form 8:
- [button] x
- **Freeze Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `freeze_membership_plan` · select · required · options: Select Subscription, 6 Months Strengthening (Incl. Cardio) (29/06/2026 - 25/12/2026)
  - dd-mm-yyyy · `freeze_start_date` · text
  - `freeze_days` · number · required
- **Freeze Subscription Fees**
  - Freeze for Days · `freeze_price` · text
  - Freeze for Days · `freeze_note` · text
- [button] Close
- [button] Freeze Subscription

Form 9:
- [button] x
- **Extend Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `extend_membership_plan` · select · required · options: Select Subscription, 6 Months Strengthening (Incl. Cardio) (29/06/2026 - 25/12/2026)
- **Your Extension starts from the next day of selected Subscription End date**
  - `extend_days` · number · required
- **Extension Subscription Fees**
  - Freeze for Days · `extend_price` · text · required
  - Freeze for Days · `extendsion_note` · text
- [button] Close
- [button] Extend Subscription

Form 10:
- [button] x
- **Transfer Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `transfer_membership_plan` · select · required · options: Select Subscription, 6 Months Strengthening (Incl. Cardio) (29/06/2026 - 25/12/2026)
- **Transfer to**
  - Enter Member Code/Enquiry Code/Phone Number · `cust_id` · text · required
- **Joining Date**
  - `start_date` · text · required
  - End Date · `end_date` · text
- **Transfer Subscription Fees**
  - Freeze for Days · `transfer_price` · text
- [button] Close
- [button] Transfer Subscription

Form 11:
- [button] x
- **Upgrade Subscription**
- **[person]**
- **Subscription Selection**
  - Select Subscription · `sub_upgrade_membership_plan` · select · required · options: Select Subscription you wish to upgrade, 6 Months Strengthening (Incl. Cardio) (29/06/2026 - 25/12/2026)
  - Check Group to add subscription · `has_couple_check` · checkbox
- **Upgrade to Membership**
  - `upgrade_membership_plan` · select · required · options: {24 people/records}
- **Joining Date**
  - Start Date · `upgrade_start_date` · text · required
  - End Date · `upgrade_end_date` · text · required
- **Plan Price**
  - Base Price · `base_price` · text
  - Subscription Paid Price · `id_subscription_paid_price` · text
  - Sales Price · `sales_price` · text · required
- **Coupon Code**
  - Coupon Code · `upgrade_coupon_code` · text
- [button] Apply
- [button] Close
- [button] Upgrade Subscription

Form 12:
- [button] x
- **[person]**
- **Membership Selection**
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - Select Membership · `searchboxpt` · text · required
  - Search... · `membership_plan-0` · text
  - Select Trainer · `searchboxptt` · text · required
  - Search... · `trainer_trail_select-0` · text
  - `second_trainer_trail_select` · multiselect · options: {8 people/records}
  - `pt_points-0` · number · required · default 0
  - `pt_sessions-0` · number · required
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Yes · `devide_sessions_between_couple` · radio
  - No · `devide_sessions_between_couple` · radio
- **Make a Payment**
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code` · text
- [button] Apply Code
- **Select A Batch**
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- [button] Close
- [button] Add Subscription

Form 13:
- [button] x
- **Downgrade Subscription**
- **[person]**
- **Subscription Selection**
  - `downgrade_subscription` · select · required · options: Select Subscription, 6 Months Strengthening (Incl. Cardio) (180 Days-GYM)
- **Downgrade to Membership**
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `membership_plan-0` · select · required · options: Please Select Subscription
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
- **Plan Price**
- **Previous Plan Paid Amount**
- **Refund Amount:**
- **Previous Plan Price:**
- **New Plan Price:**
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - Freeze for Days · `downgrade_note` · text
- [button] Close
- [button] Downgrade Subscription

Form 14:
- [button] x
- **Book a Trial**
- **[person]**
- **Membership Selection**
  - `membership_plan-0` · select · required · options: Select Membership, Free Trail - PT
  - `trainer_trail_select-0` · select · required · options: {9 people/records}
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `pt_sessions-0` · number · required
- **Make a Payment**
  - `plan_price-0` · text · required
- [button] Close
- [button] Add Subscription

Form 15:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number
- [button] Close
- [button] Add Member to Device

Form 16:
- [button] x
- **ADD CUSTOMER TO VITAL DEVICE**
- **[person]**
  - `device_list` · select · required · options: 
  - `device_ou_id` · select · required · options: 
- [button] Close
- [button] Add User To Vital Device

Form 17:
- [button] x
- **ADD CUSTOMER TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Add User To Biometric Device

Form 18:
- [button] x
- **UPDATE EXPIRY RULE FOR CUSTOMER (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `expiry_date` · text · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Update User Data To Biometric Device

Form 19:
- [button] x
- **ADD CUSTOMER TO REGISTER FACE IN DEVICE**
- **[person]**
  - Finger · `timmy_command_type` · radio · required
  - Face · `timmy_command_type` · radio
  - QR Code · `timmy_command_type` · radio
  - RFID Card · `timmy_command_type` · radio
  - `timmy_device_list` · select · required · options: Select Devices
- [button] Close
- [button] Add User To Fingerprint Device
- [button] x
- **[row value]**
- **... repeated once per row (7 rows on the page)**

Form 20:
- [button] x
- **ADD CUSTOMER TO REGISTER FACE IN DEVICE**
- **[person]**
  - `smart_office_serial_number` · select · required · options: Select Devices, None: Device
- [button] Close
- [button] Add User To SmartOffice Device
- [button] x
- **BLOCK CUSTOMER FACE IN DEVICE**
- **[person]**
  - `smart_office_serial_number_block` · select · required · options: Select Devices, None: Device
- [button] Close
- [button] Block User To SmartOffice Device

Form 21:
- [button] x
- **RE-ENROLL CUSTOMER TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Enroll User To Biometric Device

Form 22:
- [button] x
- **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Delete User From Device

Form 23:
- [button] x
- **SYNC CUSTOMER TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
- [button] Close
- [button] Sync User To Biometric Device

Form 24:
- [button] x
- **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Block User From Device

Form 25:
- [button] x
- **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Un-Block User From Device

Form 26:
- [button] x
- **Delete Member from device**
- **[person]**
- [button] Close
- [button] Delete Member to Device

Form 27:
- [button] x
- **Activate Member from device**
- **[person]**
- [button] Close
- [button] Activate Member to Device

Form 28:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number
- **Notice**
- [button] Close
- [button] Add Member & Fingerprint

Form 29:
- [button] x
- **Add Member to device Face**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number
- **Notice**
- [button] Close
- [button] Add Member & Face

Form 30:
- [button] x
- **Add Member to Etime Device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number
- **Notice**
- [button] Close
- [button] Add Fingerprint
- [button] x
- **Sync RFID to all you Gym Branches**
- [button] Close
- [button] Sync RFID

Form 31:
  - Add a photo · `center_logo` · file
- [button] x
- **Set Profile Picture**
- [button] Take Snapshot
- [button] Set As Profile Picture
- [button] Cancel
- [button] Open WebCam
- [button] Remove Photo
- **[person]**
- [button] Check Out
- **Membership Actions**
- [button] Freeze
- [button] Extension
- [button] DownGrade
- [button] Transfer
- [button] Upgrade
- [button] Assign Personal Training
- [button] Renew Personal Training
- [button] Book a free Trial
- [button] Add Subscription
- [button] Renew Subscription
- **Perform Biometric Device Operations For Customer**
- [button] Add User
- [button] Re-Add User
- [button] Unblock User
- [button] Block User
- **Member Subscriptions**
- **Active & Expired Subscriptions**
- [button] x
- **Edit Subscription**
- **[person]**
- **Membership Details**
- **6 Months Strengthening (Incl. Cardio)**
- **Joining Date**
- [button] Close
- [button] Edit Subscription
- **Medical History**
- **Medical Details**
- **.**
- **Basic Information**
- **Member Details**
- **Emergency Contact Details**
- **Additional Details**
- **Member Address & Location**
- **Address**

Pop-up: **Send Notification** — buttons: Send Notification
  - Make sure your title is short and explanatory. · `noti_name` · text · required
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea · required

Pop-up: **Add Workout** — buttons: Create A Workout Plan, Assign Workout
  - Customer's Weight · `weight` · number · required
  - feet · `height_feet` · number · required
  - inch · `height_inch` · number · required
  - Fat Loss · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Weight Gain · `goals` · radio · required
  - General Fitness · `goals` · radio · required
  - Over all fitness · `goals` · radio · required
  - Sports Specific · `goals` · radio · required
  - Marathon Training · `goals` · radio · required
  - Lean Toning · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Strength building · `goals` · radio · required
  - Calisthenics · `goals` · radio · required
  - Stamina building · `goals` · radio · required
  - Maintain Weight · `goals` · radio · required
  - Sports specific purpose · `goals` · radio · required
  - Sports Specific Purpose · `goals` · radio · required
  - Active Rest Cardio · `goals` · radio · required
  - Deep Fasting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Maintain whole body · `goals` · radio · required
  - intense · `goals` · radio · required
  - body element · `goals` · radio · required
  - Body Toning · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Motivate to doing Workout · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Mental Health · `goals` · radio · required
  - begginer · `goals` · radio · required
  - basic course · `goals` · radio · required
  - Fat Loss + Testosterone Boost + T3 & T4 Improvement · `goals` · radio · required
  - immunity · `goals` · radio · required
  - home workout · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - Pain Management · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Improve posture · `goals` · radio · required
  - Body Tone · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Weight gain · `goals` · radio · required
  - Strength boosting · `goals` · radio · required
  - Stiff Shoulder · `goals` · radio · required
  - Increase football skills · `goals` · radio · required
  - yoga · `goals` · radio · required
  - Massage · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve strength · `goals` · radio · required
  - Muscle Endurance · `goals` · radio · required
  - strength · `goals` · radio · required
  - improve Muscle blood flow · `goals` · radio · required
  - Full Body Energizer · `goals` · radio · required
  - Sports specific · `goals` · radio · required
  - Performance · `goals` · radio · required
  - Shoulder Rehab · `goals` · radio · required
  - circuit training · `goals` · radio · required
  - Core conditioning · `goals` · radio · required
  - abc · `goals` · radio · required
  - Rehab Programme · `goals` · radio · required
  - Problem · `goals` · radio · required
  - fat loss · `goals` · radio · required
  - Back problem · `goals` · radio · required
  - demo · `goals` · radio · required
  - improve balance · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Improve time · `goals` · radio · required
  - Aerobic base · `goals` · radio · required
  - Heart rate · `goals` · radio · required
  - Rehab · `goals` · radio · required
  - Inch loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - strength training · `goals` · radio · required
  - Running · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - fat loss,muscle tune · `goals` · radio · required
  - strength and size gain · `goals` · radio · required
  - muscle gain, fat loss · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - muscle gain · `goals` · radio · required

Pop-up: **Send Whatsapp Message** — buttons: Send Message
  - Enter a message that you want to send to customer. · `message_body` · textarea

Pop-up: **SubscriptionModal** — buttons: Lookup Member code, Lookup Enquiry code, Add Subscription
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew, 6 Months Strengthening (Incl. Cardio) (180 days)
  - `renew_start_date` · text
  - Select Membership · `searchbox` · text · required
  - Search... · `membership_plan-0` · text
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code-0` · text
  - Enter Member Code · `couple_cust_id` · text
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)

Pop-up: **Medical History** — buttons: Save
  - Yes · `heart_problem` · radio · required
  - No · `heart_problem` · radio · required
  - Yes · `diabetes` · radio · required
  - No · `diabetes` · radio · required
  - Yes · `chest_pain_while_exercise` · radio · required
  - No · `chest_pain_while_exercise` · radio · required
  - Yes · `feel_faint` · radio · required
  - No · `feel_faint` · radio · required
  - Yes · `back_pain_or_joints_pain` · radio · required
  - No · `back_pain_or_joints_pain` · radio · required
  - Yes · `asthma` · radio · required
  - No · `asthma` · radio · required
  - Yes · `medication` · radio · required
  - No · `medication` · radio · required
  - Yes · `any_surgery` · radio · required
  - No · `any_surgery` · radio · required
  - Yes · `any_reason_to_modify_exercise` · radio · required
  - No · `any_reason_to_modify_exercise` · radio · required
  - Yes · `pregnant` · radio · required
  - No · `pregnant` · radio · required
  - Yes · `allergies` · radio · required
  - No · `allergies` · radio · required
  - Yes · `medical_problem` · radio · required
  - No · `medical_problem` · radio · required
  - `medical_note` · textarea

Pop-up: **Freeze Subscription** — buttons: Freeze Subscription
  - Select Membership · `freeze_membership_plan` · select · required · options: Select Subscription, 6 Months Strengthening (Incl. Cardio) (29/06/2026 - 25/12/2026)
  - dd-mm-yyyy · `freeze_start_date` · text
  - `freeze_days` · number · required
  - Freeze for Days · `freeze_price` · text
  - Freeze for Days · `freeze_note` · text

Pop-up: **Extend Subscription** — buttons: Extend Subscription
  - Select Membership · `extend_membership_plan` · select · required · options: Select Subscription, 6 Months Strengthening (Incl. Cardio) (29/06/2026 - 25/12/2026)
  - `extend_days` · number · required
  - Freeze for Days · `extend_price` · text · required
  - Freeze for Days · `extendsion_note` · text

Pop-up: **Transfer Subscription** — buttons: Lookup Member code, Lookup Enquiry code, Transfer Subscription
  - Select Membership · `transfer_membership_plan` · select · required · options: Select Subscription, 6 Months Strengthening (Incl. Cardio) (29/06/2026 - 25/12/2026)
  - Enter Member Code/Enquiry Code/Phone Number · `cust_id` · text · required
  - `start_date` · text · required
  - End Date · `end_date` · text
  - Freeze for Days · `transfer_price` · text

Pop-up: **Upgrade Subscription** — buttons: Apply, Upgrade Subscription
  - Select Subscription · `sub_upgrade_membership_plan` · select · required · options: Select Subscription you wish to upgrade, 6 Months Strengthening (Incl. Cardio) (29/06/2026 - 25/12/2026)
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `upgrade_membership_plan` · select · required · options: {24 people/records}
  - Start Date · `upgrade_start_date` · text · required
  - End Date · `upgrade_end_date` · text · required
  - Base Price · `base_price` · text
  - Subscription Paid Price · `id_subscription_paid_price` · text
  - Sales Price · `sales_price` · text · required
  - Coupon Code · `upgrade_coupon_code` · text

Pop-up: **SubscriptionModall** — buttons: Lookup Member code, Lookup Enquiry code, Add Subscription
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - Select Membership · `searchboxpt` · text · required
  - Search... · `membership_plan-0` · text
  - Select Trainer · `searchboxptt` · text · required
  - Search... · `trainer_trail_select-0` · text
  - `second_trainer_trail_select` · multiselect · options: {8 people/records}
  - `pt_points-0` · number · required · default 0
  - `pt_sessions-0` · number · required
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Yes · `devide_sessions_between_couple` · radio
  - No · `devide_sessions_between_couple` · radio
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code` · text
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)

Pop-up: **Downgrade Subscription** — buttons: Downgrade Subscription
  - `downgrade_subscription` · select · required · options: Select Subscription, 6 Months Strengthening (Incl. Cardio) (180 Days-GYM)
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `membership_plan-0` · select · required · options: Please Select Subscription
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - Freeze for Days · `downgrade_note` · text

Pop-up: **Book a Trial** — buttons: Add Subscription
  - `membership_plan-0` · select · required · options: Select Membership, Free Trail - PT
  - `trainer_trail_select-0` · select · required · options: {9 people/records}
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `pt_sessions-0` · number · required
  - `plan_price-0` · text · required

Pop-up: **Add Member to device** — buttons: Add Member to Device
  - `essl_code` · number · required
  - `rfid` · number

Pop-up: **ADD CUSTOMER TO VITAL DEVICE** — buttons: Add User To Vital Device
  - `device_list` · select · required · options: 
  - `device_ou_id` · select · required · options: 

Pop-up: **ADD CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Add User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **UPDATE EXPIRY RULE FOR CUSTOMER (NEW)** — buttons: Update User Data To Biometric Device
  - `biometric_code` · number · required
  - `expiry_date` · text · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **ADD CUSTOMER TO REGISTER FACE IN DEVICE** — buttons: Add User To Fingerprint Device
  - Finger · `timmy_command_type` · radio · required
  - Face · `timmy_command_type` · radio
  - QR Code · `timmy_command_type` · radio
  - RFID Card · `timmy_command_type` · radio
  - `timmy_device_list` · select · required · options: Select Devices

Pop-up: **ADD CUSTOMER TO HAPPY HOURS** — buttons: SAVE
  - `timmy_device_happy_hr_range` · select · options: --Select--, Remove From Happy Hour, Range 1 (10:00 AM to 4:00 PM)

Pop-up: **BLOCK/UNBLOCK CUSTOMER** — buttons: NO, YES

Pop-up: **ADD CUSTOMER TO REGISTER FINGER IN DEVICE** — buttons: Add User To ZKTeco Device
  - `auth_user_id` · text
  - `user_name` · text
  - Finger · `zk_command_type` · radio

Pop-up: **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Delete User From Device
  - `del_auth_user_id` · text
  - `del_user_name` · text

Pop-up: **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Un-Block User From Device
  - `ublock_auth_user_id` · text
  - `ublock_user_name` · text

Pop-up: **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Block User From Device
  - `block_auth_user_id` · text
  - `block_user_name` · text

Pop-up: **BLOCK CUSTOMER FACE IN DEVICE** — buttons: Block User To SmartOffice Device
  - `smart_office_serial_number_block` · select · required · options: Select Devices, None: Device

Pop-up: **RE-ENROLL CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Enroll User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Delete User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **SYNC CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Sync User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list[]` · checkbox · required

Pop-up: **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Block User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Un-Block User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **Delete Member from device** — buttons: Delete Member to Device

Pop-up: **Activate Member from device** — buttons: Activate Member to Device

Pop-up: **Add Member to device Face** — buttons: Add Member & Face
  - `essl_code` · number · required
  - `rfid` · number

Pop-up: **Add Member to Etime Device** — buttons: Add Fingerprint
  - `essl_code` · number · required
  - `rfid` · number

Pop-up: **Sync RFID to all you Gym Branches** — buttons: Sync RFID

Pop-up: **Set Profile Picture** — buttons: Set As Profile Picture, Cancel

Pop-up: **Edit Subscription**
  - `edit_start_date` · date
  - `edit_end_date` · date
  - `trainer_trail_select` · select · options: {9 people/records}
  - `second_trainer_trail_select` · multiselect · options: {8 people/records}
  - `pt_sessions` · number
  - dd-mm-yyyy · `edit_invoice_date` · date
  - `edit_invoice_no` · text

Opens: `/fitness-center/customer/basic-information/Customer-{id}/` · `/fitness-center/customer/Customer-{id}/` · `/fitness-center/customer/subscriptions/Customer-{id}/0/` · `/fitness-center/customer/attendance/Customer-{id}/0/ ` · `/fitness-center/customer/workout/Customer-{id}/0/` · `/fitness-center/customer/folloup-history/Customer-{id}/0/` · `/fitness-center/customer/client-form/Customer-{id}/0/` · `/fitness-center/customer/Referral-by/Customer-{id}/0/ ` · `/ecommerce/add-order/Customer-{id}` · `/app-challenge/challenge-list/Customer/{id}/` · `/merchant/fitness-center/upgrade-combo-offer-membership/Customer-{id}/` · `/merchant/fitness-center/combo-offer-membership/Customer-{id}/` · `/fitness-center/customer/make-payment/Customer-{id}/{id}/` · `/fitness-center/customer/basic-information/Customer-{id}/ `

### Gallery Basic Information

`/fitness-center/gallery/basic-information/{id}/`

Headings: Gallery Basic Information · Image
Filter labels: Upload Image * · Image · Image Type* · Gallery Login Screen
Actions: Reset Password · Log Out · Upload · Save · Save & add another

Form 2:
- **Image**
  - `img_1` · file
- [button] Upload
  - Gallery Image · `type_of` · checkbox
  - Offer Image · `type_of` · checkbox
  - `login_type_list` · select · options: Select Login Type, NUMBER LOGIN, SLIDER LOGIN
- [button] Save
- [button] Save & add another

### Action Item Basic Information

`/fitness-center/action/action-item/{id}/`

Headings: Action Item Basic Information
Filter labels: Action Item Name* · Add Icon * · Add Colour * · Active · Add Link Name* · Show the Action item to* · Add Link Id · Add Action Id · Ordering
Actions: Reset Password · Log Out · Show Optional Fields · Save · Save & add another

Form 2:
  - `fc_text` · text · required
  - `fc_icon` · select · required · options: Select Icon, Free Workout, Claim Free Course, Browse Plans, Free Class, Buy Courses, Recipes, Track Your Diet, Message, WhatsApp, Personal Trainer, Medicine, Laboratory, Facebook, Instagram, Search, Contact Us, Website, Body Transformation, Products Icon, PT Trial, Book Classes, Books, Calendar, Credit Card … (+14)
  - `fc_color_code` · color · required · default #000000
  - Is active · `fc_is_active` · checkbox
  - `fc_link` · select · required · options: Select Link Name, About Us, Add diary/notes, Add measurement, Add post in community, Appointment Screen, Articles Screen, Checkins or Attendance Calendar, Challenges List, Coach Profile, Trainer Profile, Dietician/Nutritonist profile, Community homepage, Classes Listing, Coaches or Trainers or Dieiticians Listing, Coach Tab or PT Details Tab or Sessions Tab, Contact us, Custom Client Form with History, Custom Screen, Diary list, Diet Analysis, Exercise Analysis, External Web link (redirects user to external web browser or app), Feedback, Fitness form, health form, PARQ form, Fitness Center Notices, Fitness Center Rules … (+28)
  - Both (Paid/Free) · `sub_type` · radio
  - Paid Users · `sub_type` · radio
  - Free Users · `sub_type` · radio
  - Active PT or Personalised Plan Clients · `sub_type` · radio
  - Clients with Active general plan but no personalised plans · `sub_type` · radio
  - Clients with All Expired plans · `sub_type` · radio
- [button] Show Optional Fields
  - `fc_link_Id` · text
  - `fc_aid` · text
  - `fc_ordering` · number · default 0
- [button] Save
- [button] Save & add another

### Banner Basic Information

`/fitness-center/banner/basic-information/{id}/`

Headings: Banner Basic Information · Image
Filter labels: Banner Name * · Upload Banner image * · Website URL · Active · Link · Category · Hold down "Control", or "Command" on a Mac, to select more than one. · Show the banner to* · Meta Link · Meta Link Id · Ordering
Actions: Reset Password · Log Out · Show Optional Fields · Save · Save & add another

Form 2:
  - `fn_blog_title` · text · required
- **Image**
  - `banner_img` · file
  - `fn_web_url` · text
  - Is active · `fn_is_active` · checkbox
  - Is external link · `fn_is_external_link` · checkbox
  - `fn_tags` · select · options: Select Link Name, About Us, Add diary/notes, Add measurement, Add post in community, Appointment Screen, Articles Screen, Checkins or Attendance Calendar, Challenges List, Coach Profile, Trainer Profile, Dietician/Nutritonist profile, Community homepage, Classes Listing, Coaches or Trainers or Dieiticians Listing, Coach Tab or PT Details Tab or Sessions Tab, Contact us, Custom Client Fitness Form, Custom Screen, Diary list, Diet Analysis, Exercise Analysis, External Web link (redirects user to external web browser or app), Feedback, Fitness form, health form, PARQ form, Fitness Center Notices, Fitness Center Rules … (+27)
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `category_list` · multiselect · options: Select Category, Sponsored, Top Sponsored, Custom Screen, Custom Screen 1, Custom Screen 2, Custom Screen 3, Custom Screen 4, Custom Screen 5, Custom Screen 6, Custom Screen 7, Custom Screen 8, Custom Screen 9, Custom Screen 10
  - Both (Paid/Free) · `sub_type` · radio
  - Paid Users · `sub_type` · radio
  - Free Users · `sub_type` · radio
  - Active PT or Personalised Plan Clients · `sub_type` · radio
  - Clients with Active general plan but no personalised plans · `sub_type` · radio
  - Clients with All Expired plans · `sub_type` · radio
- [button] Show Optional Fields
  - `fn_meta_description` · text
  - `fn_meta_keywords` · text
  - `fn_ordering` · number · default 0
- [button] Save
- [button] Save & add another

### Exercise Preview

`/fitness-center/exercise/preview/{id}/`

Headings: Exercise Preview · Basic Information · Exercise Name · Exercise Type · Body Parts · Description · Instructions · Benefits · Tips · Media · Exercise Image · Exercise Image GIF
Actions: Reset Password · Log Out · Back

Form 2:
- **Basic Information**
- **Exercise Name**
- **Exercise Type**
- **Body Parts**
- **Description**
- **Instructions**
- **Benefits**
- **Tips**
- **Media**
- **Exercise Image**
- **Exercise Image GIF**
- **Exercise Video URL**

Opens: `/fitness-center/exercise/basic-information/Exercise-{id}/`

### ChallengeBasic Information

`/app-challenge/Challenge-{id}/`

Headings: ChallengeBasic Information · Challenge terms & conditions
Filter labels: Challenge Name * · Description · Video URL · Image · Challenge Start Date* · Challenge End Date* · Terms & Conditions * · Do you want to add task ? * · Yes · Client Challenge Level
Actions: Reset Password · Log Out · Cancel · Save & Next · Save

Form 2:
  - eg. Go fit fitness challenge · `challenge_name` · text · required
  - Write nice & sweet challenge description. · `challenge_description` · textarea
  - `video_link` · text
  - `challenge_logo` · file
  - Challenge Start Date* · `challenge_start_date` · text · required
  - Challenge End Date* · `challenge_end_date` · text · required
- **Challenge terms & conditions**
  - challenge related terms & conditions · `terms_and_conditions` · textarea · required
  - `edit_task` · radio
  - `edit_task` · radio
  - Client Challenge Level · `client_level` · select · options: {4 people/records}
- [button] Cancel
- [button] Save & Next
- [button] Save

### Challenge Details

`/app-challenge/view/Challenge-{id}/`

Headings: Challenge Details
Actions: Reset Password · Log Out · Posts List · Post Leader Board

Form 2:
- [button] x
- **Send SMS**
- **SMS Body**
  - Keep your SMS short. · `text_sms_body` · textarea
- [button] Send SMS
- [button] Cancel
- [button] x
- **Send Notification**
- **Notification**
  - Make sure your title is short and explanatory. · `noti_name` · text
- **Notification Body**
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea
- [button] Close
- [button] Send Notification

Pop-up: **Send SMS** — buttons: Send SMS, Cancel
  - Keep your SMS short. · `text_sms_body` · textarea

Pop-up: **Send Notification** — buttons: Send Notification
  - Make sure your title is short and explanatory. · `noti_name` · text
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea

Opens: `/app-challenge/Challenge-{id}/post-list/` · `/app-challenge/Challenge-{id}/leaderboard/`

### Enquiry

`/fitness-center/customer/attendance/Customer-{id}/0/`

Headings: Enquiry · [person] · Membership Actions · Member Attendance · Attendance Total Checkins: 0 | Total Unique Checkins :
Columns: # | Membership Plan | Start Date | End Date | Base Price | Selling Price | Apply Coupon | Action
Columns: Device Name, Type | Device Serial
Columns: # | Check In | Check Out | Session name | Source | Body Temperature
Filter labels: Add a photo · From
Actions: Reset Password · Log Out · Open WebCam · Remove Photo · Check in · Send WhatsApp Message · Place Order · See Follow Up History · View Participated Challenges · Assign Personal Training · Book a free Trial · Add Subscription · Assign Combo Offer · Delete Attendance · Submit · Back · Next

Form 2:
- [button] x
- **Send Notification**
- **[person]**
- **Notification**
  - Make sure your title is short and explanatory. · `noti_name` · text · required
- **Notification Body**
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea · required
- [button] Close
- [button] Send Notification

Form 3:
- [button] x
- **Add Workout**
- **[person]**
- **Weight**
  - Customer's Weight · `weight` · number · required
- **Height**
  - feet · `height_feet` · number · required
  - inch · `height_inch` · number · required
- **Customer's Goal**
  - Fat Loss · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Weight Gain · `goals` · radio · required
  - General Fitness · `goals` · radio · required
  - Over all fitness · `goals` · radio · required
  - Sports Specific · `goals` · radio · required
  - Marathon Training · `goals` · radio · required
  - Lean Toning · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Strength building · `goals` · radio · required
  - Calisthenics · `goals` · radio · required
  - Stamina building · `goals` · radio · required
  - Maintain Weight · `goals` · radio · required
  - Sports specific purpose · `goals` · radio · required
  - Sports Specific Purpose · `goals` · radio · required
  - Active Rest Cardio · `goals` · radio · required
  - Deep Fasting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Maintain whole body · `goals` · radio · required
  - intense · `goals` · radio · required
  - body element · `goals` · radio · required
  - Body Toning · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Motivate to doing Workout · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Mental Health · `goals` · radio · required
  - begginer · `goals` · radio · required
  - basic course · `goals` · radio · required
  - Fat Loss + Testosterone Boost + T3 & T4 Improvement · `goals` · radio · required
  - immunity · `goals` · radio · required
  - home workout · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - Pain Management · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Improve posture · `goals` · radio · required
  - Body Tone · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Weight gain · `goals` · radio · required
  - Strength boosting · `goals` · radio · required
  - Stiff Shoulder · `goals` · radio · required
  - Increase football skills · `goals` · radio · required
  - yoga · `goals` · radio · required
  - Massage · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve strength · `goals` · radio · required
  - Muscle Endurance · `goals` · radio · required
  - strength · `goals` · radio · required
  - improve Muscle blood flow · `goals` · radio · required
  - Full Body Energizer · `goals` · radio · required
  - Sports specific · `goals` · radio · required
  - Performance · `goals` · radio · required
  - Shoulder Rehab · `goals` · radio · required
  - circuit training · `goals` · radio · required
  - Core conditioning · `goals` · radio · required
  - abc · `goals` · radio · required
  - Rehab Programme · `goals` · radio · required
  - Problem · `goals` · radio · required
  - fat loss · `goals` · radio · required
  - Back problem · `goals` · radio · required
  - demo · `goals` · radio · required
  - improve balance · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Improve time · `goals` · radio · required
  - Aerobic base · `goals` · radio · required
  - Heart rate · `goals` · radio · required
  - Rehab · `goals` · radio · required
  - Inch loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - strength training · `goals` · radio · required
  - Running · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - fat loss,muscle tune · `goals` · radio · required
  - strength and size gain · `goals` · radio · required
  - muscle gain, fat loss · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - muscle gain · `goals` · radio · required
  - fat loss , weight gain , mussscle build · `goals` · radio · required
  - marathon · `goals` · radio · required
  - marathon · `goals` · radio · required
  - Marathon · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Fat loss muscle gain · `goals` · radio · required
  - diabetic management · `goals` · radio · required
  - diabetic diet plan · `goals` · radio · required
  - Postural training · `goals` · radio · required
  - Awareness · `goals` · radio · required
  - increase bench press capacity · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Toning · `goals` · radio · required
  - Muscle gain & Fat loss · `goals` · radio · required
  - STRENGTHENING · `goals` · radio · required
  - MOBILITY & JOINT CONDITION · `goals` · radio · required
  - RELAX MUSCLE · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Power lifting · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - Kidney · `goals` · radio · required
  - Yoga Satvik Diet plan · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve Flexibility · `goals` · radio · required
  - Overall health and immunity · `goals` · radio · required
  - Injury rehabilitation · `goals` · radio · required
  - Build Body strength · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Diabetes · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Muscle Gain N Toning · `goals` · radio · required
  - Build Strength Endurance · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - peak week · `goals` · radio · required
  - TRANSFORMATION · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Building abs · `goals` · radio · required
  - foundation · `goals` · radio · required
  - Muscle building · `goals` · radio · required
  - self defense level 1 · `goals` · radio · required
  - FAT LOSS · `goals` · radio · required
  - Muscular Endurance and Stamina · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Building abs · `goals` · radio · required
  - acting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - general · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Overall Health Immunity and Fatloss · `goals` · radio · required
  - Overall Health and Lean Muscle Gain · `goals` · radio · required
  - fitness · `goals` · radio · required
  - Mental health · `goals` · radio · required
  - Detoxify the body · `goals` · radio · required
  - increase speed · `goals` · radio · required
  - Strength and stamina increase, Fatloss · `goals` · radio · required
  - weight gain · `goals` · radio · required
  - Fat Loss N Toning · `goals` · radio · required
  - Pain management · `goals` · radio · required
  - Improve muscular strength · `goals` · radio · required
  - Improve joint range of motion · `goals` · radio · required
  - home program · `goals` · radio · required
  - Pain Control · `goals` · radio · required
  - Improve Joint ROM · `goals` · radio · required
  - Improve Muscle Power · `goals` · radio · required
  - Improve Balance & Coordination · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Improve Breathing capacity · `goals` · radio · required
  - Improve ADL · `goals` · radio · required
  - Fat Loss · `goals` · radio · required
  - Calf moulding · `goals` · radio · required
  - lean muscle fatloss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - increase height · `goals` · radio · required
  - increase height · `goals` · radio · required
  - Recomposition · `goals` · radio · required
  - Wight loss & muscle gain · `goals` · radio · required
  - Body Conditioning · `goals` · radio · required
  - Transform · `goals` · radio · required
  - Get Started · `goals` · radio · required
  - Knee Pain Senior citizens · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - bb · `goals` · radio · required
  - Super Transformation · `goals` · radio · required
  - beginner · `goals` · radio · required
  - beginner · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - strength build-up & toning · `goals` · radio · required
  - for normal delivery · `goals` · radio · required
  - warm muscles and joints · `goals` · radio · required
  - Fat loss muscle building · `goals` · radio · required
  - Toning 1.1 ( Resistance Band) · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Lean Muscle & Toning · `goals` · radio · required
  - Fat Loss & Improve overall Health · `goals` · radio · required
  - Lean & Photoshoot Ready Physique · `goals` · radio · required
  - Strength Building & Improve HM Timing · `goals` · radio · required
  - Fat loss & Lean physique · `goals` · radio · required
  - Full body · `goals` · radio · required
  - Weight loss & toning · `goals` · radio · required
  - new · `goals` · radio · required
  - Diabetes Diet Plan · `goals` · radio · required
  - lunch capacity enhance · `goals` · radio · required
  - Weight Loss & Fat Loss · `goals` · radio · required
  - Build Strength · `goals` · radio · required
  - Fat Loss & Beach Ready · `goals` · radio · required
  - - · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Fat Loss · `goals` · radio · required
  - Weight Loss / Fat Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - WEIGHT LOSS · `goals` · radio · required
  - Weight Loss & General Fitness · `goals` · radio · required
  - Strength Building and Marathon Training · `goals` · radio · required
  - Strength Building and Train for Ultra 50K · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Fat Loss and Wellness · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - BODY RECOMPOSITION · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - massive gan · `goals` · radio · required
  - detoxification · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Increasing Power · `goals` · radio · required
  - Functional training · `goals` · radio · required
  - Daily Movement · `goals` · radio · required
  - Weight Lose · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Lean Mass · `goals` · radio · required
  - Warm Up · `goals` · radio · required
  - Lean Mass · `goals` · radio · required
  - Lean mass · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - healthy lifestyle · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Recomposition · `goals` · radio · required
  - Toning · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss and Muscle gain · `goals` · radio · required
  - Lean mass · `goals` · radio · required
  - Lower Body · `goals` · radio · required
  - ABS · `goals` · radio · required
  - increase stamina · `goals` · radio · required
  - get fit · `goals` · radio · required
  - Weight Loss 1.2K · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - HYPERTROPHY · `goals` · radio · required
  - 1st Prep · `goals` · radio · required
  - height gain · `goals` · radio · required
  - build muscle, increasing mobility and flexibility. · `goals` · radio · required
  - Warm Up · `goals` · radio · required
  - Recovery · `goals` · radio · required
  - Maintain fitness · `goals` · radio · required

Form 4:
- [button] x
- **Send Whatsapp Message**
- **[person]**
- **Message Body**
  - Enter a message that you want to send to customer. · `message_body` · textarea
- [button] Close
- [button] Send Message

Form 5:
- [button] x
- **Send Whatsapp Message**
- **[person]**
- **Message Body**
  - Enter a message that you want to send to customer. · `whatsapp_message_body` · textarea
- [button] Close
- [button] Send Message

Form 6:
- [button] x
- **[person]**
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - `renew_start_date` · text
- [button] Apply
- [button] Add more plan
  - [redacted] · `customer_email` · text · required
  - Enter Member Code · `couple_cust_id` · text
- **Select A Batch**
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- [button] Close
- [button] Add Subscription

Form 7:
- [button] x
- **Freeze Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `freeze_membership_plan` · select · required · options: Select Subscription
  - dd-mm-yyyy · `freeze_start_date` · text
  - `freeze_days` · number · required
- **Freeze Subscription Fees**
  - Freeze for Days · `freeze_price` · text
  - Freeze for Days · `freeze_note` · text
- [button] Close
- [button] Freeze Subscription

Form 8:
- [button] x
- **Extend Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `extend_membership_plan` · select · required · options: Select Subscription
- **Your Extension starts from the next day of selected Subscription End date**
  - `extend_days` · number · required
- **Extension Subscription Fees**
  - Freeze for Days · `extend_price` · text · required
  - Freeze for Days · `extendsion_note` · text
- [button] Close
- [button] Extend Subscription

Form 9:
- [button] x
- **Transfer Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `transfer_membership_plan` · select · required · options: Select Subscription
- **Transfer to**
  - Enter Member Code/Enquiry Code/Phone Number · `cust_id` · text · required
- **Joining Date**
  - `start_date` · text · required
  - End Date · `end_date` · text
- **Transfer Subscription Fees**
  - Freeze for Days · `transfer_price` · text
- [button] Close
- [button] Transfer Subscription

Form 10:
- [button] x
- **Upgrade Subscription**
- **[person]**
- **Subscription Selection**
  - Select Subscription · `sub_upgrade_membership_plan` · select · required · options: Select Subscription you wish to upgrade
  - Check Group to add subscription · `has_couple_check` · checkbox
- **Upgrade to Membership**
  - `upgrade_membership_plan` · select · required · options: {24 people/records}
- **Joining Date**
  - Start Date · `upgrade_start_date` · text · required
  - End Date · `upgrade_end_date` · text · required
- **Plan Price**
  - Base Price · `base_price` · text
  - Subscription Paid Price · `id_subscription_paid_price` · text
  - Sales Price · `sales_price` · text · required
- **Coupon Code**
  - Coupon Code · `upgrade_coupon_code` · text
- [button] Apply
- [button] Close
- [button] Upgrade Subscription

Form 11:
- [button] x
- **[person]**
- **Membership Selection**
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - Select Membership · `searchboxpt` · text · required
  - Search... · `membership_plan-0` · text
  - [redacted] · `customer_email` · text · required
  - Select Trainer · `searchboxptt` · text · required
  - Search... · `trainer_trail_select-0` · text
  - `second_trainer_trail_select` · multiselect · options: {16 people/records}
  - `pt_points-0` · number · required · default 0
  - `pt_sessions-0` · number · required
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Yes · `devide_sessions_between_couple` · radio
  - No · `devide_sessions_between_couple` · radio
- **Make a Payment**
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code` · text
- [button] Apply Code
- **Select A Batch**
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- [button] Close
- [button] Add Subscription

Form 12:
- [button] x
- **Downgrade Subscription**
- **[person]**
- **Subscription Selection**
  - `downgrade_subscription` · select · required · options: Select Subscription
- **Downgrade to Membership**
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `membership_plan-0` · select · required · options: Please Select Subscription
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
- **Plan Price**
- **Previous Plan Paid Amount**
- **Refund Amount:**
- **Previous Plan Price:**
- **New Plan Price:**
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - Freeze for Days · `downgrade_note` · text
- [button] Close
- [button] Downgrade Subscription

Form 13:
- [button] x
- **Book a Trial**
- **[person]**
- **Membership Selection**
  - `membership_plan-0` · select · required · options: Select Membership, Free Trail - PT
  - `trainer_trail_select-0` · select · required · options: {17 people/records}
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `pt_sessions-0` · number · required
- **Make a Payment**
  - `plan_price-0` · text · required
- [button] Close
- [button] Add Subscription

Form 14:
- [button] x
- **Delete Member from device**
- **[person]**
- [button] Close
- [button] Delete Member to Device

Form 15:
- [button] x
- **Activate Member from device**
- **[person]**
- [button] Close
- [button] Activate Member to Device

Form 16:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- **Notice**
- [button] Close
- [button] Add Member & Fingerprint

Form 17:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- [button] Close
- [button] Add Member to Device
- [button] x
- **ADD CUSTOMER TO VITAL DEVICE**
- **[person]**
  - `device_list` · select · required · options: 
  - `device_ou_id` · select · required · options: 
- [button] Close
- [button] Add User To Vital Device

Form 18:
- [button] x
- **ADD CUSTOMER TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Add User To Biometric Device

Form 19:
- [button] x
- **UPDATE EXPIRY RULE FOR CUSTOMER (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `expiry_date` · text · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Update User Data To Biometric Device

Form 20:
- [button] x
- **ADD CUSTOMER TO REGISTER FACE IN DEVICE**
- **[person]**
  - Finger · `timmy_command_type` · radio · required
  - Face · `timmy_command_type` · radio
  - QR Code · `timmy_command_type` · radio
  - RFID Card · `timmy_command_type` · radio
  - `timmy_device_list` · select · required · options: Select Devices
- [button] Close
- [button] Add User To Fingerprint Device
- [button] x
- **[row value]**
- **... repeated once per row (7 rows on the page)**

Form 21:
- [button] x
- **ADD CUSTOMER TO REGISTER FACE IN DEVICE**
- **[person]**
  - `smart_office_serial_number` · select · required · options: Select Devices, None: Device
- [button] Close
- [button] Add User To SmartOffice Device
- [button] x
- **BLOCK CUSTOMER FACE IN DEVICE**
- **[person]**
  - `smart_office_serial_number_block` · select · required · options: Select Devices, None: Device
- [button] Close
- [button] Block User To SmartOffice Device

Form 22:
- [button] x
- **RE-ENROLL CUSTOMER TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Enroll User To Biometric Device

Form 23:
- [button] x
- **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Delete User From Device

Form 24:
- [button] x
- **SYNC CUSTOMER TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
- [button] Close
- [button] Sync User To Biometric Device

Form 25:
- [button] x
- **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Block User From Device

Form 26:
- [button] x
- **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Un-Block User From Device

Form 27:
- [button] x
- **Add Member to device Face**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- **Notice**
- [button] Close
- [button] Add Member & Face

Form 28:
- [button] x
- **Add Member to Etime Device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- **Notice**
- [button] Close
- [button] Add Fingerprint
- [button] x
- **Sync RFID to all you Gym Branches**
- [button] Close
- [button] Sync RFID

Form 29:
  - Add a photo · `center_logo` · file
- [button] x
- **Set Profile Picture**
- [button] Take Snapshot
- [button] Set As Profile Picture
- [button] Cancel
- [button] Open WebCam
- [button] Remove Photo
- **[person]**
- [button] Check in
- **Membership Actions**
- [button] Assign Personal Training
- [button] Book a free Trial
- [button] Add Subscription
- **Member Attendance**
- [button] Delete Attendance
  - `type_status` · select · options: Select Type, Live Sessions, PT Session, Bio-Metric, Class Attendance
  - `start_picker_date` · text
  - `end_picker_date` · text
- [button] Submit
- **Attendance Total Checkins: # | Total Unique Checkins :**
  - `check-all-box` · checkbox
- [button] Back
- [button] Next

Form 30:
- **Member Attendance**
- [button] Delete Attendance
  - `type_status` · select · options: Select Type, Live Sessions, PT Session, Bio-Metric, Class Attendance
  - `start_picker_date` · text
  - `end_picker_date` · text
- [button] Submit

Pop-up: **Send Notification** — buttons: Send Notification
  - Make sure your title is short and explanatory. · `noti_name` · text · required
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea · required

Pop-up: **Add Workout** — buttons: Create A Workout Plan, Assign Workout
  - Customer's Weight · `weight` · number · required
  - feet · `height_feet` · number · required
  - inch · `height_inch` · number · required
  - Fat Loss · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Weight Gain · `goals` · radio · required
  - General Fitness · `goals` · radio · required
  - Over all fitness · `goals` · radio · required
  - Sports Specific · `goals` · radio · required
  - Marathon Training · `goals` · radio · required
  - Lean Toning · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Strength building · `goals` · radio · required
  - Calisthenics · `goals` · radio · required
  - Stamina building · `goals` · radio · required
  - Maintain Weight · `goals` · radio · required
  - Sports specific purpose · `goals` · radio · required
  - Sports Specific Purpose · `goals` · radio · required
  - Active Rest Cardio · `goals` · radio · required
  - Deep Fasting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Maintain whole body · `goals` · radio · required
  - intense · `goals` · radio · required
  - body element · `goals` · radio · required
  - Body Toning · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Motivate to doing Workout · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Mental Health · `goals` · radio · required
  - begginer · `goals` · radio · required
  - basic course · `goals` · radio · required
  - Fat Loss + Testosterone Boost + T3 & T4 Improvement · `goals` · radio · required
  - immunity · `goals` · radio · required
  - home workout · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - Pain Management · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Improve posture · `goals` · radio · required
  - Body Tone · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Weight gain · `goals` · radio · required
  - Strength boosting · `goals` · radio · required
  - Stiff Shoulder · `goals` · radio · required
  - Increase football skills · `goals` · radio · required
  - yoga · `goals` · radio · required
  - Massage · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve strength · `goals` · radio · required
  - Muscle Endurance · `goals` · radio · required
  - strength · `goals` · radio · required
  - improve Muscle blood flow · `goals` · radio · required
  - Full Body Energizer · `goals` · radio · required
  - Sports specific · `goals` · radio · required
  - Performance · `goals` · radio · required
  - Shoulder Rehab · `goals` · radio · required
  - circuit training · `goals` · radio · required
  - Core conditioning · `goals` · radio · required
  - abc · `goals` · radio · required
  - Rehab Programme · `goals` · radio · required
  - Problem · `goals` · radio · required
  - fat loss · `goals` · radio · required
  - Back problem · `goals` · radio · required
  - demo · `goals` · radio · required
  - improve balance · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Improve time · `goals` · radio · required
  - Aerobic base · `goals` · radio · required
  - Heart rate · `goals` · radio · required
  - Rehab · `goals` · radio · required
  - Inch loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - strength training · `goals` · radio · required
  - Running · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - fat loss,muscle tune · `goals` · radio · required
  - strength and size gain · `goals` · radio · required
  - muscle gain, fat loss · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - muscle gain · `goals` · radio · required

Pop-up: **Send Whatsapp Message** — buttons: Send Message
  - Enter a message that you want to send to customer. · `message_body` · textarea

Pop-up: **SubscriptionModal** — buttons: Lookup Member code, Lookup Enquiry code, Add Subscription
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - `renew_start_date` · text
  - Select Membership · `searchbox` · text · required
  - Search... · `membership_plan-0` · text
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code-0` · text
  - [redacted] · `customer_email` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)

Pop-up: **Freeze Subscription** — buttons: Freeze Subscription
  - Select Membership · `freeze_membership_plan` · select · required · options: Select Subscription
  - dd-mm-yyyy · `freeze_start_date` · text
  - `freeze_days` · number · required
  - Freeze for Days · `freeze_price` · text
  - Freeze for Days · `freeze_note` · text

Pop-up: **Extend Subscription** — buttons: Extend Subscription
  - Select Membership · `extend_membership_plan` · select · required · options: Select Subscription
  - `extend_days` · number · required
  - Freeze for Days · `extend_price` · text · required
  - Freeze for Days · `extendsion_note` · text

Pop-up: **Transfer Subscription** — buttons: Lookup Member code, Lookup Enquiry code, Transfer Subscription
  - Select Membership · `transfer_membership_plan` · select · required · options: Select Subscription
  - Enter Member Code/Enquiry Code/Phone Number · `cust_id` · text · required
  - `start_date` · text · required
  - End Date · `end_date` · text
  - Freeze for Days · `transfer_price` · text

Pop-up: **Upgrade Subscription** — buttons: Apply, Upgrade Subscription
  - Select Subscription · `sub_upgrade_membership_plan` · select · required · options: Select Subscription you wish to upgrade
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `upgrade_membership_plan` · select · required · options: {24 people/records}
  - Start Date · `upgrade_start_date` · text · required
  - End Date · `upgrade_end_date` · text · required
  - Base Price · `base_price` · text
  - Subscription Paid Price · `id_subscription_paid_price` · text
  - Sales Price · `sales_price` · text · required
  - Coupon Code · `upgrade_coupon_code` · text

Pop-up: **SubscriptionModall** — buttons: Lookup Member code, Lookup Enquiry code, Add Subscription
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - Select Membership · `searchboxpt` · text · required
  - Search... · `membership_plan-0` · text
  - [redacted] · `customer_email` · text · required
  - Select Trainer · `searchboxptt` · text · required
  - Search... · `trainer_trail_select-0` · text
  - `second_trainer_trail_select` · multiselect · options: {16 people/records}
  - `pt_points-0` · number · required · default 0
  - `pt_sessions-0` · number · required
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Yes · `devide_sessions_between_couple` · radio
  - No · `devide_sessions_between_couple` · radio
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code` · text
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)

Pop-up: **Downgrade Subscription** — buttons: Downgrade Subscription
  - `downgrade_subscription` · select · required · options: Select Subscription
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `membership_plan-0` · select · required · options: Please Select Subscription
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - Freeze for Days · `downgrade_note` · text

Pop-up: **Book a Trial** — buttons: Add Subscription
  - `membership_plan-0` · select · required · options: Select Membership, Free Trail - PT
  - `trainer_trail_select-0` · select · required · options: {17 people/records}
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `pt_sessions-0` · number · required
  - `plan_price-0` · text · required

Pop-up: **Delete Member from device** — buttons: Delete Member to Device

Pop-up: **Activate Member from device** — buttons: Activate Member to Device

Pop-up: **Add Member to device** — buttons: Add Member & Fingerprint
  - `essl_code` · number · required
  - `rfid` · number · default None

Pop-up: **ADD CUSTOMER TO VITAL DEVICE** — buttons: Add User To Vital Device
  - `device_list` · select · required · options: 
  - `device_ou_id` · select · required · options: 

Pop-up: **ADD CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Add User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **UPDATE EXPIRY RULE FOR CUSTOMER (NEW)** — buttons: Update User Data To Biometric Device
  - `biometric_code` · number · required
  - `expiry_date` · text · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **ADD CUSTOMER TO REGISTER FACE IN DEVICE** — buttons: Add User To Fingerprint Device
  - Finger · `timmy_command_type` · radio · required
  - Face · `timmy_command_type` · radio
  - QR Code · `timmy_command_type` · radio
  - RFID Card · `timmy_command_type` · radio
  - `timmy_device_list` · select · required · options: Select Devices

Pop-up: **ADD CUSTOMER TO HAPPY HOURS** — buttons: SAVE
  - `timmy_device_happy_hr_range` · select · options: --Select--, Remove From Happy Hour, Range 1 (10:00 AM to 4:00 PM)

Pop-up: **BLOCK/UNBLOCK CUSTOMER** — buttons: NO, YES

Pop-up: **ADD CUSTOMER TO REGISTER FINGER IN DEVICE** — buttons: Add User To ZKTeco Device
  - `auth_user_id` · text
  - `user_name` · text
  - Finger · `zk_command_type` · radio

Pop-up: **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Delete User From Device
  - `del_auth_user_id` · text
  - `del_user_name` · text

Pop-up: **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Un-Block User From Device
  - `ublock_auth_user_id` · text
  - `ublock_user_name` · text

Pop-up: **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Block User From Device
  - `block_auth_user_id` · text
  - `block_user_name` · text

Pop-up: **BLOCK CUSTOMER FACE IN DEVICE** — buttons: Block User To SmartOffice Device
  - `smart_office_serial_number_block` · select · required · options: Select Devices, None: Device

Pop-up: **RE-ENROLL CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Enroll User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Delete User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **SYNC CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Sync User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list[]` · checkbox · required

Pop-up: **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Block User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Un-Block User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **Add Member to device Face** — buttons: Add Member & Face
  - `essl_code` · number · required
  - `rfid` · number · default None

Pop-up: **Add Member to Etime Device** — buttons: Add Fingerprint
  - `essl_code` · number · required
  - `rfid` · number · default None

Pop-up: **Sync RFID to all you Gym Branches** — buttons: Sync RFID

Pop-up: **Set Profile Picture** — buttons: Set As Profile Picture, Cancel

Opens: `/fitness-center/customer/basic-information/Customer-{id}/` · `/fitness-center/customer/Customer-{id}/` · `/fitness-center/customer/subscriptions/Customer-{id}/0/` · `/fitness-center/customer/attendance/Customer-{id}/0/ ` · `/fitness-center/customer/workout/Customer-{id}/0/` · `/fitness-center/customer/folloup-history/Customer-{id}/0/` · `/fitness-center/customer/client-form/Customer-{id}/0/` · `/fitness-center/customer/Referral-by/Customer-{id}/0/ ` · `/merchant/fitness-center/customers/enquiry-form/Customer-{id}/` · `/ecommerce/add-order/Customer-{id}` · `/app-challenge/challenge-list/Customer/{id}/` · `/merchant/fitness-center/combo-offer-membership/Customer-{id}/`

### Enquiry

`/fitness-center/customer/workout/Customer-{id}/0/`

Headings: Enquiry · [person] · Membership Actions
Columns: # | Membership Plan | Start Date | End Date | Base Price | Selling Price | Apply Coupon | Action
Columns: Device Name, Type | Device Serial
Filter labels: Add a photo
Actions: Reset Password · Log Out · Open WebCam · Remove Photo · Check in · Send WhatsApp Message · Place Order · See Follow Up History · View Participated Challenges · Assign Personal Training · Book a free Trial · Add Subscription · Assign Combo Offer

Form 2:
- [button] x
- **Send Notification**
- **[person]**
- **Notification**
  - Make sure your title is short and explanatory. · `noti_name` · text · required
- **Notification Body**
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea · required
- [button] Close
- [button] Send Notification

Form 3:
- [button] x
- **Add Workout**
- **[person]**
- **Weight**
  - Customer's Weight · `weight` · number · required
- **Height**
  - feet · `height_feet` · number · required
  - inch · `height_inch` · number · required
- **Customer's Goal**
  - Fat Loss · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Weight Gain · `goals` · radio · required
  - General Fitness · `goals` · radio · required
  - Over all fitness · `goals` · radio · required
  - Sports Specific · `goals` · radio · required
  - Marathon Training · `goals` · radio · required
  - Lean Toning · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Strength building · `goals` · radio · required
  - Calisthenics · `goals` · radio · required
  - Stamina building · `goals` · radio · required
  - Maintain Weight · `goals` · radio · required
  - Sports specific purpose · `goals` · radio · required
  - Sports Specific Purpose · `goals` · radio · required
  - Active Rest Cardio · `goals` · radio · required
  - Deep Fasting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Maintain whole body · `goals` · radio · required
  - intense · `goals` · radio · required
  - body element · `goals` · radio · required
  - Body Toning · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Motivate to doing Workout · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Mental Health · `goals` · radio · required
  - begginer · `goals` · radio · required
  - basic course · `goals` · radio · required
  - Fat Loss + Testosterone Boost + T3 & T4 Improvement · `goals` · radio · required
  - immunity · `goals` · radio · required
  - home workout · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - Pain Management · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Improve posture · `goals` · radio · required
  - Body Tone · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Weight gain · `goals` · radio · required
  - Strength boosting · `goals` · radio · required
  - Stiff Shoulder · `goals` · radio · required
  - Increase football skills · `goals` · radio · required
  - yoga · `goals` · radio · required
  - Massage · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve strength · `goals` · radio · required
  - Muscle Endurance · `goals` · radio · required
  - strength · `goals` · radio · required
  - improve Muscle blood flow · `goals` · radio · required
  - Full Body Energizer · `goals` · radio · required
  - Sports specific · `goals` · radio · required
  - Performance · `goals` · radio · required
  - Shoulder Rehab · `goals` · radio · required
  - circuit training · `goals` · radio · required
  - Core conditioning · `goals` · radio · required
  - abc · `goals` · radio · required
  - Rehab Programme · `goals` · radio · required
  - Problem · `goals` · radio · required
  - fat loss · `goals` · radio · required
  - Back problem · `goals` · radio · required
  - demo · `goals` · radio · required
  - improve balance · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Improve time · `goals` · radio · required
  - Aerobic base · `goals` · radio · required
  - Heart rate · `goals` · radio · required
  - Rehab · `goals` · radio · required
  - Inch loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - strength training · `goals` · radio · required
  - Running · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - fat loss,muscle tune · `goals` · radio · required
  - strength and size gain · `goals` · radio · required
  - muscle gain, fat loss · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - muscle gain · `goals` · radio · required
  - fat loss , weight gain , mussscle build · `goals` · radio · required
  - marathon · `goals` · radio · required
  - marathon · `goals` · radio · required
  - Marathon · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Fat loss muscle gain · `goals` · radio · required
  - diabetic management · `goals` · radio · required
  - diabetic diet plan · `goals` · radio · required
  - Postural training · `goals` · radio · required
  - Awareness · `goals` · radio · required
  - increase bench press capacity · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Toning · `goals` · radio · required
  - Muscle gain & Fat loss · `goals` · radio · required
  - STRENGTHENING · `goals` · radio · required
  - MOBILITY & JOINT CONDITION · `goals` · radio · required
  - RELAX MUSCLE · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Power lifting · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - Kidney · `goals` · radio · required
  - Yoga Satvik Diet plan · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve Flexibility · `goals` · radio · required
  - Overall health and immunity · `goals` · radio · required
  - Injury rehabilitation · `goals` · radio · required
  - Build Body strength · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Diabetes · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Muscle Gain N Toning · `goals` · radio · required
  - Build Strength Endurance · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - peak week · `goals` · radio · required
  - TRANSFORMATION · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Building abs · `goals` · radio · required
  - foundation · `goals` · radio · required
  - Muscle building · `goals` · radio · required
  - self defense level 1 · `goals` · radio · required
  - FAT LOSS · `goals` · radio · required
  - Muscular Endurance and Stamina · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Building abs · `goals` · radio · required
  - acting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - general · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Overall Health Immunity and Fatloss · `goals` · radio · required
  - Overall Health and Lean Muscle Gain · `goals` · radio · required
  - fitness · `goals` · radio · required
  - Mental health · `goals` · radio · required
  - Detoxify the body · `goals` · radio · required
  - increase speed · `goals` · radio · required
  - Strength and stamina increase, Fatloss · `goals` · radio · required
  - weight gain · `goals` · radio · required
  - Fat Loss N Toning · `goals` · radio · required
  - Pain management · `goals` · radio · required
  - Improve muscular strength · `goals` · radio · required
  - Improve joint range of motion · `goals` · radio · required
  - home program · `goals` · radio · required
  - Pain Control · `goals` · radio · required
  - Improve Joint ROM · `goals` · radio · required
  - Improve Muscle Power · `goals` · radio · required
  - Improve Balance & Coordination · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Improve Breathing capacity · `goals` · radio · required
  - Improve ADL · `goals` · radio · required
  - Fat Loss · `goals` · radio · required
  - Calf moulding · `goals` · radio · required
  - lean muscle fatloss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - increase height · `goals` · radio · required
  - increase height · `goals` · radio · required
  - Recomposition · `goals` · radio · required
  - Wight loss & muscle gain · `goals` · radio · required
  - Body Conditioning · `goals` · radio · required
  - Transform · `goals` · radio · required
  - Get Started · `goals` · radio · required
  - Knee Pain Senior citizens · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - bb · `goals` · radio · required
  - Super Transformation · `goals` · radio · required
  - beginner · `goals` · radio · required
  - beginner · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - strength build-up & toning · `goals` · radio · required
  - for normal delivery · `goals` · radio · required
  - warm muscles and joints · `goals` · radio · required
  - Fat loss muscle building · `goals` · radio · required
  - Toning 1.1 ( Resistance Band) · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Lean Muscle & Toning · `goals` · radio · required
  - Fat Loss & Improve overall Health · `goals` · radio · required
  - Lean & Photoshoot Ready Physique · `goals` · radio · required
  - Strength Building & Improve HM Timing · `goals` · radio · required
  - Fat loss & Lean physique · `goals` · radio · required
  - Full body · `goals` · radio · required
  - Weight loss & toning · `goals` · radio · required
  - new · `goals` · radio · required
  - Diabetes Diet Plan · `goals` · radio · required
  - lunch capacity enhance · `goals` · radio · required
  - Weight Loss & Fat Loss · `goals` · radio · required
  - Build Strength · `goals` · radio · required
  - Fat Loss & Beach Ready · `goals` · radio · required
  - - · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Fat Loss · `goals` · radio · required
  - Weight Loss / Fat Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - WEIGHT LOSS · `goals` · radio · required
  - Weight Loss & General Fitness · `goals` · radio · required
  - Strength Building and Marathon Training · `goals` · radio · required
  - Strength Building and Train for Ultra 50K · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Fat Loss and Wellness · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - BODY RECOMPOSITION · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - massive gan · `goals` · radio · required
  - detoxification · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Increasing Power · `goals` · radio · required
  - Functional training · `goals` · radio · required
  - Daily Movement · `goals` · radio · required
  - Weight Lose · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Lean Mass · `goals` · radio · required
  - Warm Up · `goals` · radio · required
  - Lean Mass · `goals` · radio · required
  - Lean mass · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - healthy lifestyle · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Recomposition · `goals` · radio · required
  - Toning · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss and Muscle gain · `goals` · radio · required
  - Lean mass · `goals` · radio · required
  - Lower Body · `goals` · radio · required
  - ABS · `goals` · radio · required
  - increase stamina · `goals` · radio · required
  - get fit · `goals` · radio · required
  - Weight Loss 1.2K · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - HYPERTROPHY · `goals` · radio · required
  - 1st Prep · `goals` · radio · required
  - height gain · `goals` · radio · required
  - build muscle, increasing mobility and flexibility. · `goals` · radio · required
  - Warm Up · `goals` · radio · required
  - Recovery · `goals` · radio · required
  - Maintain fitness · `goals` · radio · required

Form 4:
- [button] x
- **Send Whatsapp Message**
- **[person]**
- **Message Body**
  - Enter a message that you want to send to customer. · `message_body` · textarea
- [button] Close
- [button] Send Message

Form 5:
- [button] x
- **Send Whatsapp Message**
- **[person]**
- **Message Body**
  - Enter a message that you want to send to customer. · `whatsapp_message_body` · textarea
- [button] Close
- [button] Send Message

Form 6:
- [button] x
- **[person]**
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - `renew_start_date` · text
- [button] Apply
- [button] Add more plan
  - [redacted] · `customer_email` · text · required
  - Enter Member Code · `couple_cust_id` · text
- **Select A Batch**
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- [button] Close
- [button] Add Subscription

Form 7:
- [button] x
- **Freeze Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `freeze_membership_plan` · select · required · options: Select Subscription
  - dd-mm-yyyy · `freeze_start_date` · text
  - `freeze_days` · number · required
- **Freeze Subscription Fees**
  - Freeze for Days · `freeze_price` · text
  - Freeze for Days · `freeze_note` · text
- [button] Close
- [button] Freeze Subscription

Form 8:
- [button] x
- **Extend Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `extend_membership_plan` · select · required · options: Select Subscription
- **Your Extension starts from the next day of selected Subscription End date**
  - `extend_days` · number · required
- **Extension Subscription Fees**
  - Freeze for Days · `extend_price` · text · required
  - Freeze for Days · `extendsion_note` · text
- [button] Close
- [button] Extend Subscription

Form 9:
- [button] x
- **Transfer Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `transfer_membership_plan` · select · required · options: Select Subscription
- **Transfer to**
  - Enter Member Code/Enquiry Code/Phone Number · `cust_id` · text · required
- **Joining Date**
  - `start_date` · text · required
  - End Date · `end_date` · text
- **Transfer Subscription Fees**
  - Freeze for Days · `transfer_price` · text
- [button] Close
- [button] Transfer Subscription

Form 10:
- [button] x
- **Upgrade Subscription**
- **[person]**
- **Subscription Selection**
  - Select Subscription · `sub_upgrade_membership_plan` · select · required · options: Select Subscription you wish to upgrade
  - Check Group to add subscription · `has_couple_check` · checkbox
- **Upgrade to Membership**
  - `upgrade_membership_plan` · select · required · options: {24 people/records}
- **Joining Date**
  - Start Date · `upgrade_start_date` · text · required
  - End Date · `upgrade_end_date` · text · required
- **Plan Price**
  - Base Price · `base_price` · text
  - Subscription Paid Price · `id_subscription_paid_price` · text
  - Sales Price · `sales_price` · text · required
- **Coupon Code**
  - Coupon Code · `upgrade_coupon_code` · text
- [button] Apply
- [button] Close
- [button] Upgrade Subscription

Form 11:
- [button] x
- **[person]**
- **Membership Selection**
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - Select Membership · `searchboxpt` · text · required
  - Search... · `membership_plan-0` · text
  - [redacted] · `customer_email` · text · required
  - Select Trainer · `searchboxptt` · text · required
  - Search... · `trainer_trail_select-0` · text
  - `second_trainer_trail_select` · multiselect · options: {16 people/records}
  - `pt_points-0` · number · required · default 0
  - `pt_sessions-0` · number · required
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Yes · `devide_sessions_between_couple` · radio
  - No · `devide_sessions_between_couple` · radio
- **Make a Payment**
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code` · text
- [button] Apply Code
- **Select A Batch**
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- [button] Close
- [button] Add Subscription

Form 12:
- [button] x
- **Downgrade Subscription**
- **[person]**
- **Subscription Selection**
  - `downgrade_subscription` · select · required · options: Select Subscription
- **Downgrade to Membership**
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `membership_plan-0` · select · required · options: Please Select Subscription
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
- **Plan Price**
- **Previous Plan Paid Amount**
- **Refund Amount:**
- **Previous Plan Price:**
- **New Plan Price:**
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - Freeze for Days · `downgrade_note` · text
- [button] Close
- [button] Downgrade Subscription

Form 13:
- [button] x
- **Book a Trial**
- **[person]**
- **Membership Selection**
  - `membership_plan-0` · select · required · options: Select Membership, Free Trail - PT
  - `trainer_trail_select-0` · select · required · options: {17 people/records}
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `pt_sessions-0` · number · required
- **Make a Payment**
  - `plan_price-0` · text · required
- [button] Close
- [button] Add Subscription

Form 14:
- [button] x
- **Delete Member from device**
- **[person]**
- [button] Close
- [button] Delete Member to Device

Form 15:
- [button] x
- **Activate Member from device**
- **[person]**
- [button] Close
- [button] Activate Member to Device

Form 16:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- **Notice**
- [button] Close
- [button] Add Member & Fingerprint

Form 17:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- [button] Close
- [button] Add Member to Device
- [button] x
- **ADD CUSTOMER TO VITAL DEVICE**
- **[person]**
  - `device_list` · select · required · options: 
  - `device_ou_id` · select · required · options: 
- [button] Close
- [button] Add User To Vital Device

Form 18:
- [button] x
- **ADD CUSTOMER TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Add User To Biometric Device

Form 19:
- [button] x
- **UPDATE EXPIRY RULE FOR CUSTOMER (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `expiry_date` · text · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Update User Data To Biometric Device

Form 20:
- [button] x
- **ADD CUSTOMER TO REGISTER FACE IN DEVICE**
- **[person]**
  - Finger · `timmy_command_type` · radio · required
  - Face · `timmy_command_type` · radio
  - QR Code · `timmy_command_type` · radio
  - RFID Card · `timmy_command_type` · radio
  - `timmy_device_list` · select · required · options: Select Devices
- [button] Close
- [button] Add User To Fingerprint Device
- [button] x
- **[row value]**
- **... repeated once per row (7 rows on the page)**

Form 21:
- [button] x
- **ADD CUSTOMER TO REGISTER FACE IN DEVICE**
- **[person]**
  - `smart_office_serial_number` · select · required · options: Select Devices, None: Device
- [button] Close
- [button] Add User To SmartOffice Device
- [button] x
- **BLOCK CUSTOMER FACE IN DEVICE**
- **[person]**
  - `smart_office_serial_number_block` · select · required · options: Select Devices, None: Device
- [button] Close
- [button] Block User To SmartOffice Device

Form 22:
- [button] x
- **RE-ENROLL CUSTOMER TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Enroll User To Biometric Device

Form 23:
- [button] x
- **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Delete User From Device

Form 24:
- [button] x
- **SYNC CUSTOMER TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
- [button] Close
- [button] Sync User To Biometric Device

Form 25:
- [button] x
- **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Block User From Device

Form 26:
- [button] x
- **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Un-Block User From Device

Form 27:
- [button] x
- **Add Member to device Face**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- **Notice**
- [button] Close
- [button] Add Member & Face

Form 28:
- [button] x
- **Add Member to Etime Device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- **Notice**
- [button] Close
- [button] Add Fingerprint
- [button] x
- **Sync RFID to all you Gym Branches**
- [button] Close
- [button] Sync RFID

Form 29:
  - Add a photo · `center_logo` · file
- [button] x
- **Set Profile Picture**
- [button] Take Snapshot
- [button] Set As Profile Picture
- [button] Cancel
- [button] Open WebCam
- [button] Remove Photo
- **[person]**
- [button] Check in
- **Membership Actions**
- [button] Assign Personal Training
- [button] Book a free Trial
- [button] Add Subscription

Pop-up: **Send Notification** — buttons: Send Notification
  - Make sure your title is short and explanatory. · `noti_name` · text · required
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea · required

Pop-up: **Add Workout** — buttons: Create A Workout Plan, Assign Workout
  - Customer's Weight · `weight` · number · required
  - feet · `height_feet` · number · required
  - inch · `height_inch` · number · required
  - Fat Loss · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Weight Gain · `goals` · radio · required
  - General Fitness · `goals` · radio · required
  - Over all fitness · `goals` · radio · required
  - Sports Specific · `goals` · radio · required
  - Marathon Training · `goals` · radio · required
  - Lean Toning · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Strength building · `goals` · radio · required
  - Calisthenics · `goals` · radio · required
  - Stamina building · `goals` · radio · required
  - Maintain Weight · `goals` · radio · required
  - Sports specific purpose · `goals` · radio · required
  - Sports Specific Purpose · `goals` · radio · required
  - Active Rest Cardio · `goals` · radio · required
  - Deep Fasting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Maintain whole body · `goals` · radio · required
  - intense · `goals` · radio · required
  - body element · `goals` · radio · required
  - Body Toning · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Motivate to doing Workout · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Mental Health · `goals` · radio · required
  - begginer · `goals` · radio · required
  - basic course · `goals` · radio · required
  - Fat Loss + Testosterone Boost + T3 & T4 Improvement · `goals` · radio · required
  - immunity · `goals` · radio · required
  - home workout · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - Pain Management · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Improve posture · `goals` · radio · required
  - Body Tone · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Weight gain · `goals` · radio · required
  - Strength boosting · `goals` · radio · required
  - Stiff Shoulder · `goals` · radio · required
  - Increase football skills · `goals` · radio · required
  - yoga · `goals` · radio · required
  - Massage · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve strength · `goals` · radio · required
  - Muscle Endurance · `goals` · radio · required
  - strength · `goals` · radio · required
  - improve Muscle blood flow · `goals` · radio · required
  - Full Body Energizer · `goals` · radio · required
  - Sports specific · `goals` · radio · required
  - Performance · `goals` · radio · required
  - Shoulder Rehab · `goals` · radio · required
  - circuit training · `goals` · radio · required
  - Core conditioning · `goals` · radio · required
  - abc · `goals` · radio · required
  - Rehab Programme · `goals` · radio · required
  - Problem · `goals` · radio · required
  - fat loss · `goals` · radio · required
  - Back problem · `goals` · radio · required
  - demo · `goals` · radio · required
  - improve balance · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Improve time · `goals` · radio · required
  - Aerobic base · `goals` · radio · required
  - Heart rate · `goals` · radio · required
  - Rehab · `goals` · radio · required
  - Inch loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - strength training · `goals` · radio · required
  - Running · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - fat loss,muscle tune · `goals` · radio · required
  - strength and size gain · `goals` · radio · required
  - muscle gain, fat loss · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - muscle gain · `goals` · radio · required

Pop-up: **Send Whatsapp Message** — buttons: Send Message
  - Enter a message that you want to send to customer. · `message_body` · textarea

Pop-up: **SubscriptionModal** — buttons: Lookup Member code, Lookup Enquiry code, Add Subscription
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - `renew_start_date` · text
  - Select Membership · `searchbox` · text · required
  - Search... · `membership_plan-0` · text
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code-0` · text
  - [redacted] · `customer_email` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)

Pop-up: **Freeze Subscription** — buttons: Freeze Subscription
  - Select Membership · `freeze_membership_plan` · select · required · options: Select Subscription
  - dd-mm-yyyy · `freeze_start_date` · text
  - `freeze_days` · number · required
  - Freeze for Days · `freeze_price` · text
  - Freeze for Days · `freeze_note` · text

Pop-up: **Extend Subscription** — buttons: Extend Subscription
  - Select Membership · `extend_membership_plan` · select · required · options: Select Subscription
  - `extend_days` · number · required
  - Freeze for Days · `extend_price` · text · required
  - Freeze for Days · `extendsion_note` · text

Pop-up: **Transfer Subscription** — buttons: Lookup Member code, Lookup Enquiry code, Transfer Subscription
  - Select Membership · `transfer_membership_plan` · select · required · options: Select Subscription
  - Enter Member Code/Enquiry Code/Phone Number · `cust_id` · text · required
  - `start_date` · text · required
  - End Date · `end_date` · text
  - Freeze for Days · `transfer_price` · text

Pop-up: **Upgrade Subscription** — buttons: Apply, Upgrade Subscription
  - Select Subscription · `sub_upgrade_membership_plan` · select · required · options: Select Subscription you wish to upgrade
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `upgrade_membership_plan` · select · required · options: {24 people/records}
  - Start Date · `upgrade_start_date` · text · required
  - End Date · `upgrade_end_date` · text · required
  - Base Price · `base_price` · text
  - Subscription Paid Price · `id_subscription_paid_price` · text
  - Sales Price · `sales_price` · text · required
  - Coupon Code · `upgrade_coupon_code` · text

Pop-up: **SubscriptionModall** — buttons: Lookup Member code, Lookup Enquiry code, Add Subscription
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - Select Membership · `searchboxpt` · text · required
  - Search... · `membership_plan-0` · text
  - [redacted] · `customer_email` · text · required
  - Select Trainer · `searchboxptt` · text · required
  - Search... · `trainer_trail_select-0` · text
  - `second_trainer_trail_select` · multiselect · options: {16 people/records}
  - `pt_points-0` · number · required · default 0
  - `pt_sessions-0` · number · required
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Yes · `devide_sessions_between_couple` · radio
  - No · `devide_sessions_between_couple` · radio
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code` · text
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)

Pop-up: **Downgrade Subscription** — buttons: Downgrade Subscription
  - `downgrade_subscription` · select · required · options: Select Subscription
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `membership_plan-0` · select · required · options: Please Select Subscription
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - Freeze for Days · `downgrade_note` · text

Pop-up: **Book a Trial** — buttons: Add Subscription
  - `membership_plan-0` · select · required · options: Select Membership, Free Trail - PT
  - `trainer_trail_select-0` · select · required · options: {17 people/records}
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `pt_sessions-0` · number · required
  - `plan_price-0` · text · required

Pop-up: **Delete Member from device** — buttons: Delete Member to Device

Pop-up: **Activate Member from device** — buttons: Activate Member to Device

Pop-up: **Add Member to device** — buttons: Add Member & Fingerprint
  - `essl_code` · number · required
  - `rfid` · number · default None

Pop-up: **ADD CUSTOMER TO VITAL DEVICE** — buttons: Add User To Vital Device
  - `device_list` · select · required · options: 
  - `device_ou_id` · select · required · options: 

Pop-up: **ADD CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Add User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **UPDATE EXPIRY RULE FOR CUSTOMER (NEW)** — buttons: Update User Data To Biometric Device
  - `biometric_code` · number · required
  - `expiry_date` · text · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **ADD CUSTOMER TO REGISTER FACE IN DEVICE** — buttons: Add User To Fingerprint Device
  - Finger · `timmy_command_type` · radio · required
  - Face · `timmy_command_type` · radio
  - QR Code · `timmy_command_type` · radio
  - RFID Card · `timmy_command_type` · radio
  - `timmy_device_list` · select · required · options: Select Devices

Pop-up: **ADD CUSTOMER TO HAPPY HOURS** — buttons: SAVE
  - `timmy_device_happy_hr_range` · select · options: --Select--, Remove From Happy Hour, Range 1 (10:00 AM to 4:00 PM)

Pop-up: **BLOCK/UNBLOCK CUSTOMER** — buttons: NO, YES

Pop-up: **ADD CUSTOMER TO REGISTER FINGER IN DEVICE** — buttons: Add User To ZKTeco Device
  - `auth_user_id` · text
  - `user_name` · text
  - Finger · `zk_command_type` · radio

Pop-up: **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Delete User From Device
  - `del_auth_user_id` · text
  - `del_user_name` · text

Pop-up: **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Un-Block User From Device
  - `ublock_auth_user_id` · text
  - `ublock_user_name` · text

Pop-up: **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Block User From Device
  - `block_auth_user_id` · text
  - `block_user_name` · text

Pop-up: **BLOCK CUSTOMER FACE IN DEVICE** — buttons: Block User To SmartOffice Device
  - `smart_office_serial_number_block` · select · required · options: Select Devices, None: Device

Pop-up: **RE-ENROLL CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Enroll User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Delete User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **SYNC CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Sync User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list[]` · checkbox · required

Pop-up: **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Block User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Un-Block User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **Add Member to device Face** — buttons: Add Member & Face
  - `essl_code` · number · required
  - `rfid` · number · default None

Pop-up: **Add Member to Etime Device** — buttons: Add Fingerprint
  - `essl_code` · number · required
  - `rfid` · number · default None

Pop-up: **Sync RFID to all you Gym Branches** — buttons: Sync RFID

Pop-up: **Set Profile Picture** — buttons: Set As Profile Picture, Cancel

Opens: `/fitness-center/customer/basic-information/Customer-{id}/` · `/fitness-center/customer/Customer-{id}/` · `/fitness-center/customer/subscriptions/Customer-{id}/0/` · `/fitness-center/customer/attendance/Customer-{id}/0/ ` · `/fitness-center/customer/workout/Customer-{id}/0/` · `/fitness-center/customer/folloup-history/Customer-{id}/0/` · `/fitness-center/customer/client-form/Customer-{id}/0/` · `/fitness-center/customer/Referral-by/Customer-{id}/0/ ` · `/merchant/fitness-center/customers/enquiry-form/Customer-{id}/` · `/ecommerce/add-order/Customer-{id}` · `/app-challenge/challenge-list/Customer/{id}/` · `/merchant/fitness-center/combo-offer-membership/Customer-{id}/`

### Enquiry

`/fitness-center/customer/client-form/Customer-{id}/0/`

Headings: Enquiry · [person] · Membership Actions · Enrollment Form
Columns: # | Membership Plan | Start Date | End Date | Base Price | Selling Price | Apply Coupon | Action
Columns: Device Name, Type | Device Serial
Filter labels: Add a photo
Actions: Reset Password · Log Out · Open WebCam · Remove Photo · Check in · Send WhatsApp Message · Place Order · See Follow Up History · View Participated Challenges · Assign Personal Training · Book a free Trial · Add Subscription · Assign Combo Offer · Edit Enrollment Form · View Enrollment Form · Send Enrollment Form

Form 2:
- [button] x
- **Send Notification**
- **[person]**
- **Notification**
  - Make sure your title is short and explanatory. · `noti_name` · text · required
- **Notification Body**
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea · required
- [button] Close
- [button] Send Notification

Form 3:
- [button] x
- **Add Workout**
- **[person]**
- **Weight**
  - Customer's Weight · `weight` · number · required
- **Height**
  - feet · `height_feet` · number · required
  - inch · `height_inch` · number · required
- **Customer's Goal**
  - Fat Loss · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Weight Gain · `goals` · radio · required
  - General Fitness · `goals` · radio · required
  - Over all fitness · `goals` · radio · required
  - Sports Specific · `goals` · radio · required
  - Marathon Training · `goals` · radio · required
  - Lean Toning · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Strength building · `goals` · radio · required
  - Calisthenics · `goals` · radio · required
  - Stamina building · `goals` · radio · required
  - Maintain Weight · `goals` · radio · required
  - Sports specific purpose · `goals` · radio · required
  - Sports Specific Purpose · `goals` · radio · required
  - Active Rest Cardio · `goals` · radio · required
  - Deep Fasting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Maintain whole body · `goals` · radio · required
  - intense · `goals` · radio · required
  - body element · `goals` · radio · required
  - Body Toning · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Motivate to doing Workout · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Mental Health · `goals` · radio · required
  - begginer · `goals` · radio · required
  - basic course · `goals` · radio · required
  - Fat Loss + Testosterone Boost + T3 & T4 Improvement · `goals` · radio · required
  - immunity · `goals` · radio · required
  - home workout · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - Pain Management · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Improve posture · `goals` · radio · required
  - Body Tone · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Weight gain · `goals` · radio · required
  - Strength boosting · `goals` · radio · required
  - Stiff Shoulder · `goals` · radio · required
  - Increase football skills · `goals` · radio · required
  - yoga · `goals` · radio · required
  - Massage · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve strength · `goals` · radio · required
  - Muscle Endurance · `goals` · radio · required
  - strength · `goals` · radio · required
  - improve Muscle blood flow · `goals` · radio · required
  - Full Body Energizer · `goals` · radio · required
  - Sports specific · `goals` · radio · required
  - Performance · `goals` · radio · required
  - Shoulder Rehab · `goals` · radio · required
  - circuit training · `goals` · radio · required
  - Core conditioning · `goals` · radio · required
  - abc · `goals` · radio · required
  - Rehab Programme · `goals` · radio · required
  - Problem · `goals` · radio · required
  - fat loss · `goals` · radio · required
  - Back problem · `goals` · radio · required
  - demo · `goals` · radio · required
  - improve balance · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Improve time · `goals` · radio · required
  - Aerobic base · `goals` · radio · required
  - Heart rate · `goals` · radio · required
  - Rehab · `goals` · radio · required
  - Inch loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - strength training · `goals` · radio · required
  - Running · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - fat loss,muscle tune · `goals` · radio · required
  - strength and size gain · `goals` · radio · required
  - muscle gain, fat loss · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - muscle gain · `goals` · radio · required
  - fat loss , weight gain , mussscle build · `goals` · radio · required
  - marathon · `goals` · radio · required
  - marathon · `goals` · radio · required
  - Marathon · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Fat loss muscle gain · `goals` · radio · required
  - diabetic management · `goals` · radio · required
  - diabetic diet plan · `goals` · radio · required
  - Postural training · `goals` · radio · required
  - Awareness · `goals` · radio · required
  - increase bench press capacity · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Toning · `goals` · radio · required
  - Muscle gain & Fat loss · `goals` · radio · required
  - STRENGTHENING · `goals` · radio · required
  - MOBILITY & JOINT CONDITION · `goals` · radio · required
  - RELAX MUSCLE · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Power lifting · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - Kidney · `goals` · radio · required
  - Yoga Satvik Diet plan · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve Flexibility · `goals` · radio · required
  - Overall health and immunity · `goals` · radio · required
  - Injury rehabilitation · `goals` · radio · required
  - Build Body strength · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Diabetes · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Muscle Gain N Toning · `goals` · radio · required
  - Build Strength Endurance · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - peak week · `goals` · radio · required
  - TRANSFORMATION · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Building abs · `goals` · radio · required
  - foundation · `goals` · radio · required
  - Muscle building · `goals` · radio · required
  - self defense level 1 · `goals` · radio · required
  - FAT LOSS · `goals` · radio · required
  - Muscular Endurance and Stamina · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Building abs · `goals` · radio · required
  - acting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - general · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Overall Health Immunity and Fatloss · `goals` · radio · required
  - Overall Health and Lean Muscle Gain · `goals` · radio · required
  - fitness · `goals` · radio · required
  - Mental health · `goals` · radio · required
  - Detoxify the body · `goals` · radio · required
  - increase speed · `goals` · radio · required
  - Strength and stamina increase, Fatloss · `goals` · radio · required
  - weight gain · `goals` · radio · required
  - Fat Loss N Toning · `goals` · radio · required
  - Pain management · `goals` · radio · required
  - Improve muscular strength · `goals` · radio · required
  - Improve joint range of motion · `goals` · radio · required
  - home program · `goals` · radio · required
  - Pain Control · `goals` · radio · required
  - Improve Joint ROM · `goals` · radio · required
  - Improve Muscle Power · `goals` · radio · required
  - Improve Balance & Coordination · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Improve Breathing capacity · `goals` · radio · required
  - Improve ADL · `goals` · radio · required
  - Fat Loss · `goals` · radio · required
  - Calf moulding · `goals` · radio · required
  - lean muscle fatloss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - increase height · `goals` · radio · required
  - increase height · `goals` · radio · required
  - Recomposition · `goals` · radio · required
  - Wight loss & muscle gain · `goals` · radio · required
  - Body Conditioning · `goals` · radio · required
  - Transform · `goals` · radio · required
  - Get Started · `goals` · radio · required
  - Knee Pain Senior citizens · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - bb · `goals` · radio · required
  - Super Transformation · `goals` · radio · required
  - beginner · `goals` · radio · required
  - beginner · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - strength build-up & toning · `goals` · radio · required
  - for normal delivery · `goals` · radio · required
  - warm muscles and joints · `goals` · radio · required
  - Fat loss muscle building · `goals` · radio · required
  - Toning 1.1 ( Resistance Band) · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Lean Muscle & Toning · `goals` · radio · required
  - Fat Loss & Improve overall Health · `goals` · radio · required
  - Lean & Photoshoot Ready Physique · `goals` · radio · required
  - Strength Building & Improve HM Timing · `goals` · radio · required
  - Fat loss & Lean physique · `goals` · radio · required
  - Full body · `goals` · radio · required
  - Weight loss & toning · `goals` · radio · required
  - new · `goals` · radio · required
  - Diabetes Diet Plan · `goals` · radio · required
  - lunch capacity enhance · `goals` · radio · required
  - Weight Loss & Fat Loss · `goals` · radio · required
  - Build Strength · `goals` · radio · required
  - Fat Loss & Beach Ready · `goals` · radio · required
  - - · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Fat Loss · `goals` · radio · required
  - Weight Loss / Fat Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - WEIGHT LOSS · `goals` · radio · required
  - Weight Loss & General Fitness · `goals` · radio · required
  - Strength Building and Marathon Training · `goals` · radio · required
  - Strength Building and Train for Ultra 50K · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Fat Loss and Wellness · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - BODY RECOMPOSITION · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - massive gan · `goals` · radio · required
  - detoxification · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Increasing Power · `goals` · radio · required
  - Functional training · `goals` · radio · required
  - Daily Movement · `goals` · radio · required
  - Weight Lose · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Lean Mass · `goals` · radio · required
  - Warm Up · `goals` · radio · required
  - Lean Mass · `goals` · radio · required
  - Lean mass · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - healthy lifestyle · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Recomposition · `goals` · radio · required
  - Toning · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss and Muscle gain · `goals` · radio · required
  - Lean mass · `goals` · radio · required
  - Lower Body · `goals` · radio · required
  - ABS · `goals` · radio · required
  - increase stamina · `goals` · radio · required
  - get fit · `goals` · radio · required
  - Weight Loss 1.2K · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - HYPERTROPHY · `goals` · radio · required
  - 1st Prep · `goals` · radio · required
  - height gain · `goals` · radio · required
  - build muscle, increasing mobility and flexibility. · `goals` · radio · required
  - Warm Up · `goals` · radio · required
  - Recovery · `goals` · radio · required
  - Maintain fitness · `goals` · radio · required

Form 4:
- [button] x
- **Send Whatsapp Message**
- **[person]**
- **Message Body**
  - Enter a message that you want to send to customer. · `message_body` · textarea
- [button] Close
- [button] Send Message

Form 5:
- [button] x
- **Send Whatsapp Message**
- **[person]**
- **Message Body**
  - Enter a message that you want to send to customer. · `whatsapp_message_body` · textarea
- [button] Close
- [button] Send Message

Form 6:
- [button] x
- **[person]**
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - `renew_start_date` · text
- [button] Apply
- [button] Add more plan
  - [redacted] · `customer_email` · text · required
  - Enter Member Code · `couple_cust_id` · text
- **Select A Batch**
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- [button] Close
- [button] Add Subscription

Form 7:
- [button] x
- **Freeze Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `freeze_membership_plan` · select · required · options: Select Subscription
  - dd-mm-yyyy · `freeze_start_date` · text
  - `freeze_days` · number · required
- **Freeze Subscription Fees**
  - Freeze for Days · `freeze_price` · text
  - Freeze for Days · `freeze_note` · text
- [button] Close
- [button] Freeze Subscription

Form 8:
- [button] x
- **Extend Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `extend_membership_plan` · select · required · options: Select Subscription
- **Your Extension starts from the next day of selected Subscription End date**
  - `extend_days` · number · required
- **Extension Subscription Fees**
  - Freeze for Days · `extend_price` · text · required
  - Freeze for Days · `extendsion_note` · text
- [button] Close
- [button] Extend Subscription

Form 9:
- [button] x
- **Transfer Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `transfer_membership_plan` · select · required · options: Select Subscription
- **Transfer to**
  - Enter Member Code/Enquiry Code/Phone Number · `cust_id` · text · required
- **Joining Date**
  - `start_date` · text · required
  - End Date · `end_date` · text
- **Transfer Subscription Fees**
  - Freeze for Days · `transfer_price` · text
- [button] Close
- [button] Transfer Subscription

Form 10:
- [button] x
- **Upgrade Subscription**
- **[person]**
- **Subscription Selection**
  - Select Subscription · `sub_upgrade_membership_plan` · select · required · options: Select Subscription you wish to upgrade
  - Check Group to add subscription · `has_couple_check` · checkbox
- **Upgrade to Membership**
  - `upgrade_membership_plan` · select · required · options: {24 people/records}
- **Joining Date**
  - Start Date · `upgrade_start_date` · text · required
  - End Date · `upgrade_end_date` · text · required
- **Plan Price**
  - Base Price · `base_price` · text
  - Subscription Paid Price · `id_subscription_paid_price` · text
  - Sales Price · `sales_price` · text · required
- **Coupon Code**
  - Coupon Code · `upgrade_coupon_code` · text
- [button] Apply
- [button] Close
- [button] Upgrade Subscription

Form 11:
- [button] x
- **[person]**
- **Membership Selection**
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - Select Membership · `searchboxpt` · text · required
  - Search... · `membership_plan-0` · text
  - [redacted] · `customer_email` · text · required
  - Select Trainer · `searchboxptt` · text · required
  - Search... · `trainer_trail_select-0` · text
  - `second_trainer_trail_select` · multiselect · options: {16 people/records}
  - `pt_points-0` · number · required · default 0
  - `pt_sessions-0` · number · required
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Yes · `devide_sessions_between_couple` · radio
  - No · `devide_sessions_between_couple` · radio
- **Make a Payment**
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code` · text
- [button] Apply Code
- **Select A Batch**
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- [button] Close
- [button] Add Subscription

Form 12:
- [button] x
- **Downgrade Subscription**
- **[person]**
- **Subscription Selection**
  - `downgrade_subscription` · select · required · options: Select Subscription
- **Downgrade to Membership**
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `membership_plan-0` · select · required · options: Please Select Subscription
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
- **Plan Price**
- **Previous Plan Paid Amount**
- **Refund Amount:**
- **Previous Plan Price:**
- **New Plan Price:**
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - Freeze for Days · `downgrade_note` · text
- [button] Close
- [button] Downgrade Subscription

Form 13:
- [button] x
- **Book a Trial**
- **[person]**
- **Membership Selection**
  - `membership_plan-0` · select · required · options: Select Membership, Free Trail - PT
  - `trainer_trail_select-0` · select · required · options: {17 people/records}
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `pt_sessions-0` · number · required
- **Make a Payment**
  - `plan_price-0` · text · required
- [button] Close
- [button] Add Subscription

Form 14:
- [button] x
- **Delete Member from device**
- **[person]**
- [button] Close
- [button] Delete Member to Device

Form 15:
- [button] x
- **Activate Member from device**
- **[person]**
- [button] Close
- [button] Activate Member to Device

Form 16:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- **Notice**
- [button] Close
- [button] Add Member & Fingerprint

Form 17:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- [button] Close
- [button] Add Member to Device
- [button] x
- **ADD CUSTOMER TO VITAL DEVICE**
- **[person]**
  - `device_list` · select · required · options: 
  - `device_ou_id` · select · required · options: 
- [button] Close
- [button] Add User To Vital Device

Form 18:
- [button] x
- **ADD CUSTOMER TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Add User To Biometric Device

Form 19:
- [button] x
- **UPDATE EXPIRY RULE FOR CUSTOMER (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `expiry_date` · text · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Update User Data To Biometric Device

Form 20:
- [button] x
- **ADD CUSTOMER TO REGISTER FACE IN DEVICE**
- **[person]**
  - Finger · `timmy_command_type` · radio · required
  - Face · `timmy_command_type` · radio
  - QR Code · `timmy_command_type` · radio
  - RFID Card · `timmy_command_type` · radio
  - `timmy_device_list` · select · required · options: Select Devices
- [button] Close
- [button] Add User To Fingerprint Device
- [button] x
- **[row value]**
- **... repeated once per row (7 rows on the page)**

Form 21:
- [button] x
- **ADD CUSTOMER TO REGISTER FACE IN DEVICE**
- **[person]**
  - `smart_office_serial_number` · select · required · options: Select Devices, None: Device
- [button] Close
- [button] Add User To SmartOffice Device
- [button] x
- **BLOCK CUSTOMER FACE IN DEVICE**
- **[person]**
  - `smart_office_serial_number_block` · select · required · options: Select Devices, None: Device
- [button] Close
- [button] Block User To SmartOffice Device

Form 22:
- [button] x
- **RE-ENROLL CUSTOMER TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Enroll User To Biometric Device

Form 23:
- [button] x
- **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Delete User From Device

Form 24:
- [button] x
- **SYNC CUSTOMER TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
- [button] Close
- [button] Sync User To Biometric Device

Form 25:
- [button] x
- **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Block User From Device

Form 26:
- [button] x
- **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Un-Block User From Device

Form 27:
- [button] x
- **Add Member to device Face**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- **Notice**
- [button] Close
- [button] Add Member & Face

Form 28:
- [button] x
- **Add Member to Etime Device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- **Notice**
- [button] Close
- [button] Add Fingerprint
- [button] x
- **Sync RFID to all you Gym Branches**
- [button] Close
- [button] Sync RFID

Form 29:
  - Add a photo · `center_logo` · file
- [button] x
- **Set Profile Picture**
- [button] Take Snapshot
- [button] Set As Profile Picture
- [button] Cancel
- [button] Open WebCam
- [button] Remove Photo
- **[person]**
- [button] Check in
- **Membership Actions**
- [button] Assign Personal Training
- [button] Book a free Trial
- [button] Add Subscription
- **Enrollment Form**
- [button] Send Enrollment Form

Pop-up: **Send Notification** — buttons: Send Notification
  - Make sure your title is short and explanatory. · `noti_name` · text · required
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea · required

Pop-up: **Add Workout** — buttons: Create A Workout Plan, Assign Workout
  - Customer's Weight · `weight` · number · required
  - feet · `height_feet` · number · required
  - inch · `height_inch` · number · required
  - Fat Loss · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Weight Gain · `goals` · radio · required
  - General Fitness · `goals` · radio · required
  - Over all fitness · `goals` · radio · required
  - Sports Specific · `goals` · radio · required
  - Marathon Training · `goals` · radio · required
  - Lean Toning · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Strength building · `goals` · radio · required
  - Calisthenics · `goals` · radio · required
  - Stamina building · `goals` · radio · required
  - Maintain Weight · `goals` · radio · required
  - Sports specific purpose · `goals` · radio · required
  - Sports Specific Purpose · `goals` · radio · required
  - Active Rest Cardio · `goals` · radio · required
  - Deep Fasting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Maintain whole body · `goals` · radio · required
  - intense · `goals` · radio · required
  - body element · `goals` · radio · required
  - Body Toning · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Motivate to doing Workout · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Mental Health · `goals` · radio · required
  - begginer · `goals` · radio · required
  - basic course · `goals` · radio · required
  - Fat Loss + Testosterone Boost + T3 & T4 Improvement · `goals` · radio · required
  - immunity · `goals` · radio · required
  - home workout · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - Pain Management · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Improve posture · `goals` · radio · required
  - Body Tone · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Weight gain · `goals` · radio · required
  - Strength boosting · `goals` · radio · required
  - Stiff Shoulder · `goals` · radio · required
  - Increase football skills · `goals` · radio · required
  - yoga · `goals` · radio · required
  - Massage · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve strength · `goals` · radio · required
  - Muscle Endurance · `goals` · radio · required
  - strength · `goals` · radio · required
  - improve Muscle blood flow · `goals` · radio · required
  - Full Body Energizer · `goals` · radio · required
  - Sports specific · `goals` · radio · required
  - Performance · `goals` · radio · required
  - Shoulder Rehab · `goals` · radio · required
  - circuit training · `goals` · radio · required
  - Core conditioning · `goals` · radio · required
  - abc · `goals` · radio · required
  - Rehab Programme · `goals` · radio · required
  - Problem · `goals` · radio · required
  - fat loss · `goals` · radio · required
  - Back problem · `goals` · radio · required
  - demo · `goals` · radio · required
  - improve balance · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Improve time · `goals` · radio · required
  - Aerobic base · `goals` · radio · required
  - Heart rate · `goals` · radio · required
  - Rehab · `goals` · radio · required
  - Inch loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - strength training · `goals` · radio · required
  - Running · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - fat loss,muscle tune · `goals` · radio · required
  - strength and size gain · `goals` · radio · required
  - muscle gain, fat loss · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - muscle gain · `goals` · radio · required

Pop-up: **Send Whatsapp Message** — buttons: Send Message
  - Enter a message that you want to send to customer. · `message_body` · textarea

Pop-up: **SubscriptionModal** — buttons: Lookup Member code, Lookup Enquiry code, Add Subscription
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - `renew_start_date` · text
  - Select Membership · `searchbox` · text · required
  - Search... · `membership_plan-0` · text
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code-0` · text
  - [redacted] · `customer_email` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)

Pop-up: **Freeze Subscription** — buttons: Freeze Subscription
  - Select Membership · `freeze_membership_plan` · select · required · options: Select Subscription
  - dd-mm-yyyy · `freeze_start_date` · text
  - `freeze_days` · number · required
  - Freeze for Days · `freeze_price` · text
  - Freeze for Days · `freeze_note` · text

Pop-up: **Extend Subscription** — buttons: Extend Subscription
  - Select Membership · `extend_membership_plan` · select · required · options: Select Subscription
  - `extend_days` · number · required
  - Freeze for Days · `extend_price` · text · required
  - Freeze for Days · `extendsion_note` · text

Pop-up: **Transfer Subscription** — buttons: Lookup Member code, Lookup Enquiry code, Transfer Subscription
  - Select Membership · `transfer_membership_plan` · select · required · options: Select Subscription
  - Enter Member Code/Enquiry Code/Phone Number · `cust_id` · text · required
  - `start_date` · text · required
  - End Date · `end_date` · text
  - Freeze for Days · `transfer_price` · text

Pop-up: **Upgrade Subscription** — buttons: Apply, Upgrade Subscription
  - Select Subscription · `sub_upgrade_membership_plan` · select · required · options: Select Subscription you wish to upgrade
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `upgrade_membership_plan` · select · required · options: {24 people/records}
  - Start Date · `upgrade_start_date` · text · required
  - End Date · `upgrade_end_date` · text · required
  - Base Price · `base_price` · text
  - Subscription Paid Price · `id_subscription_paid_price` · text
  - Sales Price · `sales_price` · text · required
  - Coupon Code · `upgrade_coupon_code` · text

Pop-up: **SubscriptionModall** — buttons: Lookup Member code, Lookup Enquiry code, Add Subscription
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - Select Membership · `searchboxpt` · text · required
  - Search... · `membership_plan-0` · text
  - [redacted] · `customer_email` · text · required
  - Select Trainer · `searchboxptt` · text · required
  - Search... · `trainer_trail_select-0` · text
  - `second_trainer_trail_select` · multiselect · options: {16 people/records}
  - `pt_points-0` · number · required · default 0
  - `pt_sessions-0` · number · required
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Yes · `devide_sessions_between_couple` · radio
  - No · `devide_sessions_between_couple` · radio
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code` · text
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)

Pop-up: **Downgrade Subscription** — buttons: Downgrade Subscription
  - `downgrade_subscription` · select · required · options: Select Subscription
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `membership_plan-0` · select · required · options: Please Select Subscription
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - Freeze for Days · `downgrade_note` · text

Pop-up: **Book a Trial** — buttons: Add Subscription
  - `membership_plan-0` · select · required · options: Select Membership, Free Trail - PT
  - `trainer_trail_select-0` · select · required · options: {17 people/records}
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `pt_sessions-0` · number · required
  - `plan_price-0` · text · required

Pop-up: **Delete Member from device** — buttons: Delete Member to Device

Pop-up: **Activate Member from device** — buttons: Activate Member to Device

Pop-up: **Add Member to device** — buttons: Add Member & Fingerprint
  - `essl_code` · number · required
  - `rfid` · number · default None

Pop-up: **ADD CUSTOMER TO VITAL DEVICE** — buttons: Add User To Vital Device
  - `device_list` · select · required · options: 
  - `device_ou_id` · select · required · options: 

Pop-up: **ADD CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Add User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **UPDATE EXPIRY RULE FOR CUSTOMER (NEW)** — buttons: Update User Data To Biometric Device
  - `biometric_code` · number · required
  - `expiry_date` · text · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **ADD CUSTOMER TO REGISTER FACE IN DEVICE** — buttons: Add User To Fingerprint Device
  - Finger · `timmy_command_type` · radio · required
  - Face · `timmy_command_type` · radio
  - QR Code · `timmy_command_type` · radio
  - RFID Card · `timmy_command_type` · radio
  - `timmy_device_list` · select · required · options: Select Devices

Pop-up: **ADD CUSTOMER TO HAPPY HOURS** — buttons: SAVE
  - `timmy_device_happy_hr_range` · select · options: --Select--, Remove From Happy Hour, Range 1 (10:00 AM to 4:00 PM)

Pop-up: **BLOCK/UNBLOCK CUSTOMER** — buttons: NO, YES

Pop-up: **ADD CUSTOMER TO REGISTER FINGER IN DEVICE** — buttons: Add User To ZKTeco Device
  - `auth_user_id` · text
  - `user_name` · text
  - Finger · `zk_command_type` · radio

Pop-up: **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Delete User From Device
  - `del_auth_user_id` · text
  - `del_user_name` · text

Pop-up: **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Un-Block User From Device
  - `ublock_auth_user_id` · text
  - `ublock_user_name` · text

Pop-up: **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Block User From Device
  - `block_auth_user_id` · text
  - `block_user_name` · text

Pop-up: **BLOCK CUSTOMER FACE IN DEVICE** — buttons: Block User To SmartOffice Device
  - `smart_office_serial_number_block` · select · required · options: Select Devices, None: Device

Pop-up: **RE-ENROLL CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Enroll User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Delete User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **SYNC CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Sync User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list[]` · checkbox · required

Pop-up: **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Block User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Un-Block User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **Add Member to device Face** — buttons: Add Member & Face
  - `essl_code` · number · required
  - `rfid` · number · default None

Pop-up: **Add Member to Etime Device** — buttons: Add Fingerprint
  - `essl_code` · number · required
  - `rfid` · number · default None

Pop-up: **Sync RFID to all you Gym Branches** — buttons: Sync RFID

Pop-up: **Set Profile Picture** — buttons: Set As Profile Picture, Cancel

Opens: `/fitness-center/customer/basic-information/Customer-{id}/` · `/fitness-center/customer/Customer-{id}/` · `/fitness-center/customer/subscriptions/Customer-{id}/0/` · `/fitness-center/customer/attendance/Customer-{id}/0/ ` · `/fitness-center/customer/workout/Customer-{id}/0/` · `/fitness-center/customer/folloup-history/Customer-{id}/0/` · `/fitness-center/customer/client-form/Customer-{id}/0/` · `/fitness-center/customer/Referral-by/Customer-{id}/0/ ` · `/merchant/fitness-center/customers/enquiry-form/Customer-{id}/` · `/ecommerce/add-order/Customer-{id}` · `/app-challenge/challenge-list/Customer/{id}/` · `/merchant/fitness-center/combo-offer-membership/Customer-{id}/`

### Enquiry

`/fitness-center/customer/Referral-by/Customer-{id}/0/`

Headings: Enquiry · [person] · Membership Actions · No Referral Found On This Page
Columns: # | Membership Plan | Start Date | End Date | Base Price | Selling Price | Apply Coupon | Action
Columns: Device Name, Type | Device Serial
Filter labels: Add a photo
Actions: Reset Password · Log Out · Open WebCam · Remove Photo · Check in · Send WhatsApp Message · Place Order · See Follow Up History · View Participated Challenges · Assign Personal Training · Book a free Trial · Add Subscription · Assign Combo Offer · Back · Next

Form 2:
- [button] x
- **Send Notification**
- **[person]**
- **Notification**
  - Make sure your title is short and explanatory. · `noti_name` · text · required
- **Notification Body**
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea · required
- [button] Close
- [button] Send Notification

Form 3:
- [button] x
- **Add Workout**
- **[person]**
- **Weight**
  - Customer's Weight · `weight` · number · required
- **Height**
  - feet · `height_feet` · number · required
  - inch · `height_inch` · number · required
- **Customer's Goal**
  - Fat Loss · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Weight Gain · `goals` · radio · required
  - General Fitness · `goals` · radio · required
  - Over all fitness · `goals` · radio · required
  - Sports Specific · `goals` · radio · required
  - Marathon Training · `goals` · radio · required
  - Lean Toning · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Strength building · `goals` · radio · required
  - Calisthenics · `goals` · radio · required
  - Stamina building · `goals` · radio · required
  - Maintain Weight · `goals` · radio · required
  - Sports specific purpose · `goals` · radio · required
  - Sports Specific Purpose · `goals` · radio · required
  - Active Rest Cardio · `goals` · radio · required
  - Deep Fasting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Maintain whole body · `goals` · radio · required
  - intense · `goals` · radio · required
  - body element · `goals` · radio · required
  - Body Toning · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Motivate to doing Workout · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Mental Health · `goals` · radio · required
  - begginer · `goals` · radio · required
  - basic course · `goals` · radio · required
  - Fat Loss + Testosterone Boost + T3 & T4 Improvement · `goals` · radio · required
  - immunity · `goals` · radio · required
  - home workout · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - Pain Management · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Improve posture · `goals` · radio · required
  - Body Tone · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Weight gain · `goals` · radio · required
  - Strength boosting · `goals` · radio · required
  - Stiff Shoulder · `goals` · radio · required
  - Increase football skills · `goals` · radio · required
  - yoga · `goals` · radio · required
  - Massage · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve strength · `goals` · radio · required
  - Muscle Endurance · `goals` · radio · required
  - strength · `goals` · radio · required
  - improve Muscle blood flow · `goals` · radio · required
  - Full Body Energizer · `goals` · radio · required
  - Sports specific · `goals` · radio · required
  - Performance · `goals` · radio · required
  - Shoulder Rehab · `goals` · radio · required
  - circuit training · `goals` · radio · required
  - Core conditioning · `goals` · radio · required
  - abc · `goals` · radio · required
  - Rehab Programme · `goals` · radio · required
  - Problem · `goals` · radio · required
  - fat loss · `goals` · radio · required
  - Back problem · `goals` · radio · required
  - demo · `goals` · radio · required
  - improve balance · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Improve time · `goals` · radio · required
  - Aerobic base · `goals` · radio · required
  - Heart rate · `goals` · radio · required
  - Rehab · `goals` · radio · required
  - Inch loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - strength training · `goals` · radio · required
  - Running · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - fat loss,muscle tune · `goals` · radio · required
  - strength and size gain · `goals` · radio · required
  - muscle gain, fat loss · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - muscle gain · `goals` · radio · required
  - fat loss , weight gain , mussscle build · `goals` · radio · required
  - marathon · `goals` · radio · required
  - marathon · `goals` · radio · required
  - Marathon · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Fat loss muscle gain · `goals` · radio · required
  - diabetic management · `goals` · radio · required
  - diabetic diet plan · `goals` · radio · required
  - Postural training · `goals` · radio · required
  - Awareness · `goals` · radio · required
  - increase bench press capacity · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Toning · `goals` · radio · required
  - Muscle gain & Fat loss · `goals` · radio · required
  - STRENGTHENING · `goals` · radio · required
  - MOBILITY & JOINT CONDITION · `goals` · radio · required
  - RELAX MUSCLE · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Power lifting · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - Kidney · `goals` · radio · required
  - Yoga Satvik Diet plan · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve Flexibility · `goals` · radio · required
  - Overall health and immunity · `goals` · radio · required
  - Injury rehabilitation · `goals` · radio · required
  - Build Body strength · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Belly Fat · `goals` · radio · required
  - Diabetes · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Muscle Gain N Toning · `goals` · radio · required
  - Build Strength Endurance · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - peak week · `goals` · radio · required
  - TRANSFORMATION · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Building abs · `goals` · radio · required
  - foundation · `goals` · radio · required
  - Muscle building · `goals` · radio · required
  - self defense level 1 · `goals` · radio · required
  - FAT LOSS · `goals` · radio · required
  - Muscular Endurance and Stamina · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Building abs · `goals` · radio · required
  - acting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - general · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Overall Health Immunity and Fatloss · `goals` · radio · required
  - Overall Health and Lean Muscle Gain · `goals` · radio · required
  - fitness · `goals` · radio · required
  - Mental health · `goals` · radio · required
  - Detoxify the body · `goals` · radio · required
  - increase speed · `goals` · radio · required
  - Strength and stamina increase, Fatloss · `goals` · radio · required
  - weight gain · `goals` · radio · required
  - Fat Loss N Toning · `goals` · radio · required
  - Pain management · `goals` · radio · required
  - Improve muscular strength · `goals` · radio · required
  - Improve joint range of motion · `goals` · radio · required
  - home program · `goals` · radio · required
  - Pain Control · `goals` · radio · required
  - Improve Joint ROM · `goals` · radio · required
  - Improve Muscle Power · `goals` · radio · required
  - Improve Balance & Coordination · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Improve Breathing capacity · `goals` · radio · required
  - Improve ADL · `goals` · radio · required
  - Fat Loss · `goals` · radio · required
  - Calf moulding · `goals` · radio · required
  - lean muscle fatloss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - increase height · `goals` · radio · required
  - increase height · `goals` · radio · required
  - Recomposition · `goals` · radio · required
  - Wight loss & muscle gain · `goals` · radio · required
  - Body Conditioning · `goals` · radio · required
  - Transform · `goals` · radio · required
  - Get Started · `goals` · radio · required
  - Knee Pain Senior citizens · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - bb · `goals` · radio · required
  - Super Transformation · `goals` · radio · required
  - beginner · `goals` · radio · required
  - beginner · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - strength build-up & toning · `goals` · radio · required
  - for normal delivery · `goals` · radio · required
  - warm muscles and joints · `goals` · radio · required
  - Fat loss muscle building · `goals` · radio · required
  - Toning 1.1 ( Resistance Band) · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Lean Muscle & Toning · `goals` · radio · required
  - Fat Loss & Improve overall Health · `goals` · radio · required
  - Lean & Photoshoot Ready Physique · `goals` · radio · required
  - Strength Building & Improve HM Timing · `goals` · radio · required
  - Fat loss & Lean physique · `goals` · radio · required
  - Full body · `goals` · radio · required
  - Weight loss & toning · `goals` · radio · required
  - new · `goals` · radio · required
  - Diabetes Diet Plan · `goals` · radio · required
  - lunch capacity enhance · `goals` · radio · required
  - Weight Loss & Fat Loss · `goals` · radio · required
  - Build Strength · `goals` · radio · required
  - Fat Loss & Beach Ready · `goals` · radio · required
  - - · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Fat Loss · `goals` · radio · required
  - Weight Loss / Fat Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - WEIGHT LOSS · `goals` · radio · required
  - Weight Loss & General Fitness · `goals` · radio · required
  - Strength Building and Marathon Training · `goals` · radio · required
  - Strength Building and Train for Ultra 50K · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Fat Loss and Wellness · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - BODY RECOMPOSITION · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - massive gan · `goals` · radio · required
  - detoxification · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - Increasing Power · `goals` · radio · required
  - Functional training · `goals` · radio · required
  - Daily Movement · `goals` · radio · required
  - Weight Lose · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Lean Mass · `goals` · radio · required
  - Warm Up · `goals` · radio · required
  - Lean Mass · `goals` · radio · required
  - Lean mass · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - healthy lifestyle · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Recomposition · `goals` · radio · required
  - Toning · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - weight loss and Muscle gain · `goals` · radio · required
  - Lean mass · `goals` · radio · required
  - Lower Body · `goals` · radio · required
  - ABS · `goals` · radio · required
  - increase stamina · `goals` · radio · required
  - get fit · `goals` · radio · required
  - Weight Loss 1.2K · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - HYPERTROPHY · `goals` · radio · required
  - 1st Prep · `goals` · radio · required
  - height gain · `goals` · radio · required
  - build muscle, increasing mobility and flexibility. · `goals` · radio · required
  - Warm Up · `goals` · radio · required
  - Recovery · `goals` · radio · required
  - Maintain fitness · `goals` · radio · required

Form 4:
- [button] x
- **Send Whatsapp Message**
- **[person]**
- **Message Body**
  - Enter a message that you want to send to customer. · `message_body` · textarea
- [button] Close
- [button] Send Message

Form 5:
- [button] x
- **Send Whatsapp Message**
- **[person]**
- **Message Body**
  - Enter a message that you want to send to customer. · `whatsapp_message_body` · textarea
- [button] Close
- [button] Send Message

Form 6:
- [button] x
- **[person]**
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - `renew_start_date` · text
- [button] Apply
- [button] Add more plan
  - [redacted] · `customer_email` · text · required
  - Enter Member Code · `couple_cust_id` · text
- **Select A Batch**
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- [button] Close
- [button] Add Subscription

Form 7:
- [button] x
- **Freeze Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `freeze_membership_plan` · select · required · options: Select Subscription
  - dd-mm-yyyy · `freeze_start_date` · text
  - `freeze_days` · number · required
- **Freeze Subscription Fees**
  - Freeze for Days · `freeze_price` · text
  - Freeze for Days · `freeze_note` · text
- [button] Close
- [button] Freeze Subscription

Form 8:
- [button] x
- **Extend Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `extend_membership_plan` · select · required · options: Select Subscription
- **Your Extension starts from the next day of selected Subscription End date**
  - `extend_days` · number · required
- **Extension Subscription Fees**
  - Freeze for Days · `extend_price` · text · required
  - Freeze for Days · `extendsion_note` · text
- [button] Close
- [button] Extend Subscription

Form 9:
- [button] x
- **Transfer Subscription**
- **[person]**
- **Subscription Selection**
  - Select Membership · `transfer_membership_plan` · select · required · options: Select Subscription
- **Transfer to**
  - Enter Member Code/Enquiry Code/Phone Number · `cust_id` · text · required
- **Joining Date**
  - `start_date` · text · required
  - End Date · `end_date` · text
- **Transfer Subscription Fees**
  - Freeze for Days · `transfer_price` · text
- [button] Close
- [button] Transfer Subscription

Form 10:
- [button] x
- **Upgrade Subscription**
- **[person]**
- **Subscription Selection**
  - Select Subscription · `sub_upgrade_membership_plan` · select · required · options: Select Subscription you wish to upgrade
  - Check Group to add subscription · `has_couple_check` · checkbox
- **Upgrade to Membership**
  - `upgrade_membership_plan` · select · required · options: {65 people/records}
- **Joining Date**
  - Start Date · `upgrade_start_date` · text · required
  - End Date · `upgrade_end_date` · text · required
- **Plan Price**
  - Base Price · `base_price` · text
  - Subscription Paid Price · `id_subscription_paid_price` · text
  - Sales Price · `sales_price` · text · required
- **Coupon Code**
  - Coupon Code · `upgrade_coupon_code` · text
- [button] Apply
- [button] Close
- [button] Upgrade Subscription

Form 11:
- [button] x
- **[person]**
- **Membership Selection**
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - Select Membership · `searchboxpt` · text · required
  - Search... · `membership_plan-0` · text
  - [redacted] · `customer_email` · text · required
  - Select Trainer · `searchboxptt` · text · required
  - Search... · `trainer_trail_select-0` · text
  - `second_trainer_trail_select` · multiselect · options: {16 people/records}
  - `pt_points-0` · number · required · default 0
  - `pt_sessions-0` · number · required
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Yes · `devide_sessions_between_couple` · radio
  - No · `devide_sessions_between_couple` · radio
- **Make a Payment**
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code` · text
- [button] Apply Code
- **Select A Batch**
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)
- [button] Close
- [button] Add Subscription

Form 12:
- [button] x
- **Downgrade Subscription**
- **[person]**
- **Subscription Selection**
  - `downgrade_subscription` · select · required · options: Select Subscription
- **Downgrade to Membership**
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `membership_plan-0` · select · required · options: Please Select Subscription
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
- **Plan Price**
- **Previous Plan Paid Amount**
- **Refund Amount:**
- **Previous Plan Price:**
- **New Plan Price:**
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - Freeze for Days · `downgrade_note` · text
- [button] Close
- [button] Downgrade Subscription

Form 13:
- [button] x
- **Book a Trial**
- **[person]**
- **Membership Selection**
  - `membership_plan-0` · select · required · options: Select Membership, Free Trail - PT
  - `trainer_trail_select-0` · select · required · options: {17 people/records}
- **Joining Date**
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `pt_sessions-0` · number · required
- **Make a Payment**
  - `plan_price-0` · text · required
- [button] Close
- [button] Add Subscription

Form 14:
- [button] x
- **Delete Member from device**
- **[person]**
- [button] Close
- [button] Delete Member to Device

Form 15:
- [button] x
- **Activate Member from device**
- **[person]**
- [button] Close
- [button] Activate Member to Device

Form 16:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- **Notice**
- [button] Close
- [button] Add Member & Fingerprint

Form 17:
- [button] x
- **Add Member to device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- [button] Close
- [button] Add Member to Device
- [button] x
- **ADD CUSTOMER TO VITAL DEVICE**
- **[person]**
  - `device_list` · select · required · options: 
  - `device_ou_id` · select · required · options: 
- [button] Close
- [button] Add User To Vital Device

Form 18:
- [button] x
- **ADD CUSTOMER TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Add User To Biometric Device

Form 19:
- [button] x
- **UPDATE EXPIRY RULE FOR CUSTOMER (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `expiry_date` · text · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Update User Data To Biometric Device

Form 20:
- [button] x
- **ADD CUSTOMER TO REGISTER FACE IN DEVICE**
- **[person]**
  - Finger · `timmy_command_type` · radio · required
  - Face · `timmy_command_type` · radio
  - QR Code · `timmy_command_type` · radio
  - RFID Card · `timmy_command_type` · radio
  - `timmy_device_list` · select · required · options: Select Devices
- [button] Close
- [button] Add User To Fingerprint Device
- [button] x
- **[row value]**
- **... repeated once per row (7 rows on the page)**

Form 21:
- [button] x
- **ADD CUSTOMER TO REGISTER FACE IN DEVICE**
- **[person]**
  - `smart_office_serial_number` · select · required · options: Select Devices, None: Device
- [button] Close
- [button] Add User To SmartOffice Device
- [button] x
- **BLOCK CUSTOMER FACE IN DEVICE**
- **[person]**
  - `smart_office_serial_number_block` · select · required · options: Select Devices, None: Device
- [button] Close
- [button] Block User To SmartOffice Device

Form 22:
- [button] x
- **RE-ENROLL CUSTOMER TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Enroll User To Biometric Device

Form 23:
- [button] x
- **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Delete User From Device

Form 24:
- [button] x
- **SYNC CUSTOMER TO BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
- [button] Close
- [button] Sync User To Biometric Device

Form 25:
- [button] x
- **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Block User From Device

Form 26:
- [button] x
- **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)**
- **[person]**
  - `device_list` · select · required · options: Select Devices, [redacted]
- [button] Close
- [button] Un-Block User From Device

Form 27:
- [button] x
- **Add Member to device Face**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- **Notice**
- [button] Close
- [button] Add Member & Face

Form 28:
- [button] x
- **Add Member to Etime Device**
- **[person]**
  - `essl_code` · number · required
- **RFID Number**
  - `rfid` · number · default None
- **Notice**
- [button] Close
- [button] Add Fingerprint
- [button] x
- **Sync RFID to all you Gym Branches**
- [button] Close
- [button] Sync RFID

Form 29:
  - Add a photo · `center_logo` · file
- [button] x
- **Set Profile Picture**
- [button] Take Snapshot
- [button] Set As Profile Picture
- [button] Cancel
- [button] Open WebCam
- [button] Remove Photo
- **[person]**
- [button] Check in
- **Membership Actions**
- [button] Assign Personal Training
- [button] Book a free Trial
- [button] Add Subscription
- **No Referral Found On This Page**
- [button] Back
- [button] Next

Form 30:
- **No Referral Found On This Page**
- [button] Back
- [button] Next

Pop-up: **Send Notification** — buttons: Send Notification
  - Make sure your title is short and explanatory. · `noti_name` · text · required
  - Description you provide should explain the notification clearly in short. · `noti_body` · textarea · required

Pop-up: **Add Workout** — buttons: Create A Workout Plan, Assign Workout
  - Customer's Weight · `weight` · number · required
  - feet · `height_feet` · number · required
  - inch · `height_inch` · number · required
  - Fat Loss · `goals` · radio · required
  - Muscle Gain · `goals` · radio · required
  - Weight Gain · `goals` · radio · required
  - General Fitness · `goals` · radio · required
  - Over all fitness · `goals` · radio · required
  - Sports Specific · `goals` · radio · required
  - Marathon Training · `goals` · radio · required
  - Lean Toning · `goals` · radio · required
  - ABS · `goals` · radio · required
  - Strength building · `goals` · radio · required
  - Calisthenics · `goals` · radio · required
  - Stamina building · `goals` · radio · required
  - Maintain Weight · `goals` · radio · required
  - Sports specific purpose · `goals` · radio · required
  - Sports Specific Purpose · `goals` · radio · required
  - Active Rest Cardio · `goals` · radio · required
  - Deep Fasting · `goals` · radio · required
  - Weight loss · `goals` · radio · required
  - Maintain whole body · `goals` · radio · required
  - intense · `goals` · radio · required
  - body element · `goals` · radio · required
  - Body Toning · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Motivate to doing Workout · `goals` · radio · required
  - Fitness · `goals` · radio · required
  - Mental Health · `goals` · radio · required
  - begginer · `goals` · radio · required
  - basic course · `goals` · radio · required
  - Fat Loss + Testosterone Boost + T3 & T4 Improvement · `goals` · radio · required
  - immunity · `goals` · radio · required
  - home workout · `goals` · radio · required
  - overall fitness · `goals` · radio · required
  - Pain Management · `goals` · radio · required
  - Transformation · `goals` · radio · required
  - Improve flexibility · `goals` · radio · required
  - Improve posture · `goals` · radio · required
  - Body Tone · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Weight gain · `goals` · radio · required
  - Strength boosting · `goals` · radio · required
  - Stiff Shoulder · `goals` · radio · required
  - Increase football skills · `goals` · radio · required
  - yoga · `goals` · radio · required
  - Massage · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - Improve strength · `goals` · radio · required
  - Muscle Endurance · `goals` · radio · required
  - strength · `goals` · radio · required
  - improve Muscle blood flow · `goals` · radio · required
  - Full Body Energizer · `goals` · radio · required
  - Sports specific · `goals` · radio · required
  - Performance · `goals` · radio · required
  - Shoulder Rehab · `goals` · radio · required
  - circuit training · `goals` · radio · required
  - Core conditioning · `goals` · radio · required
  - abc · `goals` · radio · required
  - Rehab Programme · `goals` · radio · required
  - Problem · `goals` · radio · required
  - fat loss · `goals` · radio · required
  - Back problem · `goals` · radio · required
  - demo · `goals` · radio · required
  - improve balance · `goals` · radio · required
  - Endurance · `goals` · radio · required
  - Improve time · `goals` · radio · required
  - Aerobic base · `goals` · radio · required
  - Heart rate · `goals` · radio · required
  - Rehab · `goals` · radio · required
  - Inch loss · `goals` · radio · required
  - weight loss · `goals` · radio · required
  - strength training · `goals` · radio · required
  - Running · `goals` · radio · required
  - Weight Loss · `goals` · radio · required
  - fat loss,muscle tune · `goals` · radio · required
  - strength and size gain · `goals` · radio · required
  - muscle gain, fat loss · `goals` · radio · required
  - developing abs · `goals` · radio · required
  - muscle gain · `goals` · radio · required

Pop-up: **Send Whatsapp Message** — buttons: Send Message
  - Enter a message that you want to send to customer. · `message_body` · textarea

Pop-up: **SubscriptionModal** — buttons: Lookup Member code, Lookup Enquiry code, Add Subscription
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - `renew_start_date` · text
  - Select Membership · `searchbox` · text · required
  - Search... · `membership_plan-0` · text
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code-0` · text
  - [redacted] · `customer_email` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)

Pop-up: **Freeze Subscription** — buttons: Freeze Subscription
  - Select Membership · `freeze_membership_plan` · select · required · options: Select Subscription
  - dd-mm-yyyy · `freeze_start_date` · text
  - `freeze_days` · number · required
  - Freeze for Days · `freeze_price` · text
  - Freeze for Days · `freeze_note` · text

Pop-up: **Extend Subscription** — buttons: Extend Subscription
  - Select Membership · `extend_membership_plan` · select · required · options: Select Subscription
  - `extend_days` · number · required
  - Freeze for Days · `extend_price` · text · required
  - Freeze for Days · `extendsion_note` · text

Pop-up: **Transfer Subscription** — buttons: Lookup Member code, Lookup Enquiry code, Transfer Subscription
  - Select Membership · `transfer_membership_plan` · select · required · options: Select Subscription
  - Enter Member Code/Enquiry Code/Phone Number · `cust_id` · text · required
  - `start_date` · text · required
  - End Date · `end_date` · text
  - Freeze for Days · `transfer_price` · text

Pop-up: **Upgrade Subscription** — buttons: Apply, Upgrade Subscription
  - Select Subscription · `sub_upgrade_membership_plan` · select · required · options: Select Subscription you wish to upgrade
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `upgrade_membership_plan` · select · required · options: {65 people/records}
  - Start Date · `upgrade_start_date` · text · required
  - End Date · `upgrade_end_date` · text · required
  - Base Price · `base_price` · text
  - Subscription Paid Price · `id_subscription_paid_price` · text
  - Sales Price · `sales_price` · text · required
  - Coupon Code · `upgrade_coupon_code` · text

Pop-up: **SubscriptionModall** — buttons: Lookup Member code, Lookup Enquiry code, Add Subscription
  - `renew_membership_plan` · select · options: Select Membership Plan to Renew
  - Select Membership · `searchboxpt` · text · required
  - Search... · `membership_plan-0` · text
  - [redacted] · `customer_email` · text · required
  - Select Trainer · `searchboxptt` · text · required
  - Search... · `trainer_trail_select-0` · text
  - `second_trainer_trail_select` · multiselect · options: {16 people/records}
  - `pt_points-0` · number · required · default 0
  - `pt_sessions-0` · number · required
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - Enter Member Code · `couple_cust_id` · text
  - Yes · `devide_sessions_between_couple` · radio
  - No · `devide_sessions_between_couple` · radio
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - `coupon_code` · text
  - Hold down "Control", or "Command" on a Mac, to select more than one. · `batch_select` · multiselect · options: Select a batch ( Select here for no batch. ), 10:00 AM - 11:30 AM 10 a.m., 10:30 AM - 12:00 PM 10:30 a.m., 2:00 PM - 3:30 PM 2 p.m., 2:30 PM - 4:00 PM 2:30 p.m., 3:00 PM - 4:30 PM 3 p.m., 3:30 PM - 5:00 PM 3:30 p.m., 4:00 PM - 5:30 PM 4 p.m., 4:30 PM - 6:00 PM 4:30 p.m., 5:00 AM - 6:30 AM 5 a.m., 5:00 PM - 6:30 PM 5 p.m., 5:30 AM - 7:00 AM 5:30 a.m., 5:30 PM - 7:00 PM 5:30 p.m., 6:00 AM - 7:30 AM 6 a.m., 6:00 PM - 7:30 PM 6 p.m., 6:30 AM - 8:00 AM 6:30 a.m., 6:30 PM - 8:00 PM 6:30 p.m., 7:00 AM - 8:30 AM 7 a.m., 7:00 PM - 8:30 PM 7 p.m., 7:30 AM - 9:00 AM 7:30 a.m., 7:30 PM - 9:00 PM 7:30 p.m., 8:00 AM - 9:30 AM 8 a.m., 8:00 PM - 9:30 PM 8 p.m., 8:30 AM - 10:00 AM 8:30 a.m., 8:30 PM - 10:00 PM 8:30 p.m. … (+2)

Pop-up: **Downgrade Subscription** — buttons: Downgrade Subscription
  - `downgrade_subscription` · select · required · options: Select Subscription
  - Check Group to add subscription · `has_couple_check` · checkbox
  - `membership_plan-0` · select · required · options: Please Select Subscription
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `base_plan_price-0` · text · required
  - `plan_price-0` · number · required
  - Freeze for Days · `downgrade_note` · text

Pop-up: **Book a Trial** — buttons: Add Subscription
  - `membership_plan-0` · select · required · options: Select Membership, Free Trail - PT
  - `trainer_trail_select-0` · select · required · options: {17 people/records}
  - dd-mm-yyyy · `start_date-0` · text · required
  - dd-mm-yyyy · `end_date-0` · text · required
  - `pt_sessions-0` · number · required
  - `plan_price-0` · text · required

Pop-up: **Delete Member from device** — buttons: Delete Member to Device

Pop-up: **Activate Member from device** — buttons: Activate Member to Device

Pop-up: **Add Member to device** — buttons: Add Member & Fingerprint
  - `essl_code` · number · required
  - `rfid` · number · default None

Pop-up: **ADD CUSTOMER TO VITAL DEVICE** — buttons: Add User To Vital Device
  - `device_list` · select · required · options: 
  - `device_ou_id` · select · required · options: 

Pop-up: **ADD CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Add User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **UPDATE EXPIRY RULE FOR CUSTOMER (NEW)** — buttons: Update User Data To Biometric Device
  - `biometric_code` · number · required
  - `expiry_date` · text · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **ADD CUSTOMER TO REGISTER FACE IN DEVICE** — buttons: Add User To Fingerprint Device
  - Finger · `timmy_command_type` · radio · required
  - Face · `timmy_command_type` · radio
  - QR Code · `timmy_command_type` · radio
  - RFID Card · `timmy_command_type` · radio
  - `timmy_device_list` · select · required · options: Select Devices

Pop-up: **ADD CUSTOMER TO HAPPY HOURS** — buttons: SAVE
  - `timmy_device_happy_hr_range` · select · options: --Select--, Remove From Happy Hour, Range 1 (10:00 AM to 4:00 PM)

Pop-up: **BLOCK/UNBLOCK CUSTOMER** — buttons: NO, YES

Pop-up: **ADD CUSTOMER TO REGISTER FINGER IN DEVICE** — buttons: Add User To ZKTeco Device
  - `auth_user_id` · text
  - `user_name` · text
  - Finger · `zk_command_type` · radio

Pop-up: **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Delete User From Device
  - `del_auth_user_id` · text
  - `del_user_name` · text

Pop-up: **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Un-Block User From Device
  - `ublock_auth_user_id` · text
  - `ublock_user_name` · text

Pop-up: **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW).** — buttons: Block User From Device
  - `block_auth_user_id` · text
  - `block_user_name` · text

Pop-up: **BLOCK CUSTOMER FACE IN DEVICE** — buttons: Block User To SmartOffice Device
  - `smart_office_serial_number_block` · select · required · options: Select Devices, None: Device

Pop-up: **RE-ENROLL CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Enroll User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **DELETE CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Delete User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **SYNC CUSTOMER TO BIOMETRIC DEVICE (NEW)** — buttons: Sync User To Biometric Device
  - `biometric_code` · number · required
  - `rfid` · number · default None
  - Finger · `command_type` · radio · required
  - Face · `command_type` · radio
  - Face Ex · `command_type` · radio
  - RFID Card · `command_type` · radio
  - `device_list[]` · checkbox · required

Pop-up: **BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Block User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE (NEW)** — buttons: Un-Block User From Device
  - `device_list` · select · required · options: Select Devices, [redacted]

Pop-up: **Add Member to device Face** — buttons: Add Member & Face
  - `essl_code` · number · required
  - `rfid` · number · default None

Pop-up: **Add Member to Etime Device** — buttons: Add Fingerprint
  - `essl_code` · number · required
  - `rfid` · number · default None

Pop-up: **Sync RFID to all you Gym Branches** — buttons: Sync RFID

Pop-up: **Set Profile Picture** — buttons: Set As Profile Picture, Cancel

Opens: `/fitness-center/customer/basic-information/Customer-{id}/` · `/fitness-center/customer/Customer-{id}/` · `/fitness-center/customer/subscriptions/Customer-{id}/0/` · `/fitness-center/customer/attendance/Customer-{id}/0/ ` · `/fitness-center/customer/workout/Customer-{id}/0/` · `/fitness-center/customer/folloup-history/Customer-{id}/0/` · `/fitness-center/customer/client-form/Customer-{id}/0/` · `/fitness-center/customer/Referral-by/Customer-{id}/0/ ` · `/merchant/fitness-center/customers/enquiry-form/Customer-{id}/` · `/ecommerce/add-order/Customer-{id}` · `/app-challenge/challenge-list/Customer/{id}/` · `/merchant/fitness-center/combo-offer-membership/Customer-{id}/`

### Combo Offer Membership

`/merchant/fitness-center/combo-offer-membership/Customer-{id}/`

Headings: Combo Offer Membership · [person] · Select Combo Offer
Columns: # | Membership Plan | Start Date | End Date | Base Price | Selling Price | Apply Coupon/Select Trainer
Actions: Reset Password · Log Out · Submit

Form 2:
- **Combo Offer Membership**
- **[person]**
- **Select Combo Offer**
  - `combo_offer_id` · select · options: Select an Combo, Diamond Combo
- [button] Submit

Form 3:
- [button] x
- **ARE YOU SURE YOU WANT TO DELETE THIS offer ?**
- [button] Yes
- [button] No

Pop-up: **ARE YOU SURE YOU WANT TO DELETE THIS offer ?** — buttons: No

### Product & CartListing

`/ecommerce/add-order/Customer-{id}`

Headings: Product & CartListing · Product Listing · Cart Listing Cart Total 0 0
Columns: Product Name | Image | Color | Size | Price | Quantity | Quantity To Buy | Action
Columns: Product Name | Image | Price | Quantity | Color | Size | Store Name | Action
Actions: Reset Password · Log Out · Search

Form 2:
- **Product & CartListing**
- **Product Listing**
  - Search · `search_list` · text
- [button] Search
- **Cart Listing Cart Total # 0**

Opens: `/ecommerce/product-details/Customer-{id}/{id}/{id}/{id}`

