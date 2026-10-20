# Client requirements, source of truth

Extracted verbatim from `RECRUITMENT SYSTEM REQUIREMENTS 1.docx` (the signed
client requirements document) on 2026-10-15. Requirement text and the client's
own Comment column are reproduced unchanged.

**Reference IDs (PR-1, LL-3, ...) are assigned here and are stable.** Use these
in all traceability from now on. The 5.1 / 5.8 / 10.3 style numbering used in
`docs/traceability-requirements.md` is a separate scheme whose mapping to this
document has never been verified.

The document's stated contract total is KES 260,000.


## Position requisition

| ID | Requirement | Client comment |
|---|---|---|
| PR-1 | The system should support pre-loading of all the current job positions | done |
| PR-2 | The system should support the concept of positions, and vacancies linked to positions | done (grade enforcement) |
| PR-3 | The system should support single/multiple levels of approval of the employment requisition. | done |
| PR-4 | Ability to attach job description to the requisition | done |
| PR-5 | Ability to define whether its internal or external advert | done |
| PR-6 | Ability to Auto-generate job reference number | done |

## Job Evaluation

| ID | Requirement | Client comment |
|---|---|---|
| JE-1 | The system should accept definition of the Job grade from the Job Evaluation Manager/ Job Evaluation Tool | done |
| JE-2 | The system should not allow one to proceed unless the job grade is input | done |
| JE-3 | Notify hiring manager of the job grade for their approval | done |

## Job advertisement

| ID | Requirement | Client comment |
|---|---|---|
| JA-1 | Ability to have standard template for job adverts | done |
| JA-2 | Dis-allow for posting of incomplete adverts such as if Job title, location, type of contract, grade, etc are missing | done |
| JA-3 | The system should support single/multiple levels of approval of the advert. | done |
| JA-4 | Support for various job status such as Pending Cancelled Re-advertised Internal advert – link should not be visible to public on the site Re-opened. | done |
| JA-5 | The job advert page should be customizable for any unique positions such as consultancies (table) | deferred |
| JA-6 | Ability to re-open closed jobs and automatically update the status to re-advertised | done |
| JA-7 | Automatic closure of job adverts after the closing date unless otherwise re-opened | done |
| JA-8 | Support for RSS feeds that can share/broadcast the job advert to other sites such as LinkedIn, twitter, etc. | done |
| JA-9 | Support for pre-screening questions | done |
| JA-10 | Allow for minor editing of posted jobs | done |
| JA-11 | Ability to set/define scores for the answers of the pre-screening questions during long listing | done |
| JA-12 | Allow for posting of confidential jobs that do not appear on the main page | done |
| JA-13 | Allow for customization of the advert link | deferred |
| JA-14 | Support for unlimited job adverts | done (depends on storage subscription) |
| JA-15 | Allow for posting of internal job adverts that do not appear on the main page | done |

## Job applications

| ID | Requirement | Client comment |
|---|---|---|
| APP-1 | Support for unlimited number of candidates | done (depends on storage subscription) |
| APP-2 | The system should allow candidates to set their profile and upload their CV that they can use to apply for jobs. | done |
| APP-3 | The system should have a checklist for all the necessary documents i.e. Cover letter, CV and any other relevant document | done |
| APP-4 | The system should generate alert if the necessary documents have not been attached | done |
| APP-5 | Candidates should NOT apply for closed jobs and a link for closed should display message “job is no longer available” | done |
| APP-6 | Provide ability to determine if applicant has applied before for various positions or for same position | done |
| APP-7 | The system should not allow duplicate application for same job | done |
| APP-8 | Provide ability to determine if applicant has worked for the organization before | done |
| APP-9 | The system should have ability to determine if applicants are internal candidates |  |
| APP-10 | Allow candidates to subscribe to Autumhire jobs . |  |
| APP-11 | Ability to capture the age, gender, nationality , current city/country of residence among other details for the applicant |  |
| APP-12 | Automatic alert to candidates when they submit their applications |  |
| APP-13 | Add a clause that candidates confirm that the information they provide is correct and will be verified and candidates disqualified if it is confirmed to be false |  |

## Long Listing

| ID | Requirement | Client comment |
|---|---|---|
| LL-1 | Ability to prepare a preliminary long listing by matching applicants details with the job specifications |  |
| LL-2 | Ability to define scores for the pre-screening questions |  |
| LL-3 | Access to position and candidates specifications for easy referencing |  |
| LL-4 | System should assist in online tracking/monitoring of applicants through each stage of the recruitment cycle. |  |
| LL-5 | The system should have the query facility to search for one or more applicants and then drill down into their detailed resume information. |  |
| LL-6 | The recruitment data bank should hold individual applicants’ CVs containing personal details, competencies, previous work experience and academic attainments. It should be possible to identify the source of the application. |  |
| LL-7 | Facility to execute bulk changes/updates to applicant’s status in one single activity/screen. |  |
| LL-8 | The system should support generating reports that identify the best match profiles by comparing required and existing competencies for a job/position. |  |
| LL-9 | Ability to share the candidate’s(s) profiles, questionnaire, CV and cover letter through email |  |
| LL-10 | Ability to download the applicant’s CVs, cover letters etc. with an automatic renaming as required |  |

## Short Listing

| ID | Requirement | Client comment |
|---|---|---|
| SL-1 | Allow for sharing of the long list with the hiring manager and panel for purposes of shortlisting |  |
| SL-2 | Ability update the status after shortlisting |  |
| SL-3 | Functionality for collaboration between the panel members without affecting the results when doing short listing |  |
| SL-4 | Provision for rationale and comments to support the shortlisting decisions |  |
| SL-5 | Allow for creation of criteria to be used for shortlisting |  |
| SL-6 | Allow shortlisted candidates to be fill bio-data online |  |
| SL-7 | For every page, have specified duties of the hiring manager |  |

## Interviews

| ID | Requirement | Client comment |
|---|---|---|
| INT-1 | Ability to load and share interview schedules using interview templates. |  |
| INT-2 | Ability to load interview questions |  |
| INT-3 | Ability to record interview scores and results with detailed comments. |  |
| INT-4 | Support for generation of interview reports |  |

## Reference checks

| ID | Requirement | Client comment |
|---|---|---|
| REF-1 | Allow resourcing team to perform reference checks on the selected candidate |  |
| REF-2 | Auto generated reference email picking details from the advert to the referees |  |

## Offers & regrets

| ID | Requirement | Client comment |
|---|---|---|
| OFF-1 | Have a status for ‘offer accepted’ or ‘offer rejected’ when the candidate accepts or rejects the offer |  |
| OFF-2 | Send a notification to the hiring manager keeping them updated of the status of the process |  |
| OFF-3 | Allow status to be updated to ‘Hired’ upon acceptance of the offer by the candidate |  |
| OFF-4 | Send regret notification to shortlisted candidates who are not hired |  |
| OFF-5 | There must be a simple mechanism for moving individuals through the recruitment cycle and of the successful candidate into the new employee onboarding processes |  |

## Flexibility

| ID | Requirement | Client comment |
|---|---|---|
| FLEX-1 | Has provision for importation of data from Excel, documents like photos, referees and email attachments |  |
| FLEX-2 | Calculation functions e.g. calculate number of days, etc. |  |
| FLEX-3 | Sort function, search function etc |  |

## Metrics/ Reports

| ID | Requirement | Client comment |
|---|---|---|
| REP-1 | Multiple report views: Spreadsheets, Graphical reports: pie charts, time line, etc. |  |
| REP-2 | Recruits per department, directorate, etc |  |
| REP-3 | Graphs: Gantt chart, pie charts, bar graphs |  |
| REP-4 | Age ratio |  |
| REP-5 | Cost per Hire |  |
| REP-6 | Time taken to fill position matrix |  |
| REP-7 | Vacancy costs |  |
| REP-8 | Turnover rate |  |
| REP-9 | Source of job adverts |  |
| REP-10 | (30-40 years) Years Hire Ratio; 40-50, 50-60. |  |
| REP-11 | Nationality |  |
| REP-12 | Ability to support ad-hoc reports |  |
| REP-13 | Internal candidates hired ratio |  |
| REP-14 | Gender Hire Ratio |  |
| REP-15 | Ability to create our own reports |  |

## Security

| ID | Requirement | Client comment |
|---|---|---|
| SEC-1 | No amendments/ deletions on applications by the applicant |  |
| SEC-2 | No access to unauthorized personnel |  |
| SEC-3 | Different roles and access levels for Administrators, candidates, hiring managers, etc. |  |
| SEC-4 | Audit trail for all user actions with time and date |  |

## Backup and recovery

| ID | Requirement | Client comment |
|---|---|---|
| BAK-1 | The system should provide for built in backup and recovery protection |  |

## Integration with other systems

| ID | Requirement | Client comment |
|---|---|---|
| INTG-1 | The system should support integration with other systems such as OCS, etc. |  |
| INTG-2 | The system should provide Web Services (WS) such as WSDL, SOAP, RDF, RSS, etc. Describe the different WS that are "out of the box." |  |

## Training

| ID | Requirement | Client comment |
|---|---|---|
| TRN-1 | 1 | What is the cost of training? |
| TRN-2 | Amount of time required for training |  |

## Data ownership

| ID | Requirement | Client comment |
|---|---|---|
| OWN-1 | Autumhire should own the data |  |

## Support & Maintenance

| ID | Requirement | Client comment |
|---|---|---|
| SUP-1 | Any maintenance and upkeep costs required? |  |
| SUP-2 | Is the system managed and maintained at Autumhire premises site and by ?Autumhire |  |

## Archiving

| ID | Requirement | Client comment |
|---|---|---|
| ARC-1 | Ability to archive multiple jobs, candidates, etc. |  |

## Location independent

| ID | Requirement | Client comment |
|---|---|---|
| LOC-1 | Ability to work from multiple locations; Addis, Nairobi, etc. |  |

## Government compliance

| ID | Requirement | Client comment |
|---|---|---|
| GOV-1 | Compliance with regulations such as copyright, etc. |  |

## System architecture

| ID | Requirement | Client comment |
|---|---|---|
| ARCH-1 | Describe the system architecture |  |
| ARCH-2 | What databases does it support or run on |  |
| ARCH-3 | Is the system a modular solution? |  |
| ARCH-4 | Which browsers and versions of those browsers does the software run on? |  |
| ARCH-5 | What development language(s) would use to extend/enhance the system? |  |

## Reliability

| ID | Requirement | Client comment |
|---|---|---|
| REL-1 | system checks and reports must be mathematically correct, including ranking of candidates |  |

## Data & templates management

| ID | Requirement | Client comment |
|---|---|---|
| DTM-1 | The solution should support various rule sets for managing differing recruitment cycles |  |
| DTM-2 | Ability to support various templates that can be managed by administrators |  |
| DTM-3 | The system should have the facility for maintenance of data on recruitment and advertising agents. |  |
| DTM-4 | Maintain information detailing specific employment activity phases (applicant, exam/test, interview, etc.) |  |
| DTM-5 | Ability to maintain new hiring data on applicant database for reporting and analysis |  |

## What constitutes customer service

| ID | Requirement | Client comment |
|---|---|---|
| CS-1 | Such as upgrades, training, etc. |  |
