**RECRUITMENT SYSTEM REQUIREMENTS**   
   
**PURPOSE**   
   
The purpose of this document is to explain the functional and technical requirements for the following modules  

1. Recruitment process   
2. Reporting module 

The requirements will be divided into two: 

1. User/functional requirements: these describe the core functionality of the expected system.  This includes the data requirements and functional process requirements   
2. Technical requirement: these describe the technical aspects of the system such as the underlying and backend architecture, system security, etc.   
    

**OBJECTIVES OF THE SYSTEM**   
   
The following are the objectives of the recruitment system: 

* To facilitate the smooth flow of the recruitment process thus ensuring effectiveness and efficiency;   
* To enable ease of application;   
* To ease the process of report generation;   
* To ensure data security, availability and ease of retrieval. 

   
 

1. **Recruitment process** 

The process flow diagram below indicates the major steps of the current recruitment process   
   
![Diagram 13, SmartArt diagram][image1]   
![Diagram 15, SmartArt diagram][image2]   
 ![A blue arrow pointing downAI-generated content may be incorrect.][image3]

| Stage  | \#  | REQUIREMENT  | comment   |
| :---- | :---- | :---- | :---- |
| **Position requisition**  |   | The system should support pre-loading of all the current job positions  |   |
|  |   | The system should support the concept of positions, and vacancies linked to positions  |   |
|  |   | System should support single/multiple levels of approval of the employment requisition.  |   |
|  |   | Ability to attach job description  to the requisition  |   |
|  |   | Ability to define whether its internal or external advert  |   |
|  |   | Ability to Auto-generate job reference number  |   |
|  |   |   |   |
| **Job Evaluation**  |   | The system should accept definition of the Job grade from the Job Evaluation Manager/ Job Evaluation Tool  |   |
|  |   | The system should not allow one to proceed unless the job grade is input  |   |
|  |   | Notify hiring manager of the job grade for their approval  |   |
|  |   |   |   |
| **Job advertisement**  |   | Ability to have standard template for job adverts   |   |
|  |   | Dis-allow for posting of incomplete adverts such as if Job title, location, type of contract, grade, etc are missing  |   |
|  |   | The system should support single/multiple levels of approval of the advert.  |   |
|  |   | Support for various job status such as Pending  Cancelled  Re-advertised  Internal advert – link should not be visible to public on the site  Re-opened.  |   |
|  |   | The job advert page should be customizable for any unique positions such as consultancies   |   |
|  |   | Ability to re-open closed jobs and automatically update the status to re-advertised  |   |
|  |   | Automatic closure of job adverts after the closing date unless otherwise re-opened  |   |
|  |   | Support for RSS feeds that can share/broadcast the job advert to other sites such as LinkedIn, twitter, etc.  |   |
|  |   | Support for pre-screening questions  |   |
|  |   | Allow for minor editing of posted jobs  |   |
|  |   | Ability to set/define scores for the answers of the pre-screening questions during long listing  |   |
|  |   | Allow for posting of confidential jobs that  do not appear on the main page  |   |
|  |   | Allow for customization of the advert link  |   |
|  |   | Support for unlimited job adverts  |   |
|  |   | Allow for posting of internal job adverts that  do not appear on the main page  |   |
|  |   |   |   |
| **Job applications**  |   | Support for unlimited number of candidates  |   |
|  |   | The system should allow candidates to set their profile and upload their CV that they can use to apply for jobs.   |   |
|  |   | The system should have a checklist for all the necessary documents i.e. Cover letter, CV and any other relevant document  |   |
|  |   | The system should generate alert if the necessary documents have not been attached   |   |
|  |   | Candidates should NOT apply for closed jobs and a link for closed should display message “job is no longer available”  |   |
|  |   | Provide ability to determine if applicant has applied before for various positions or for same position  |   |
|  |   | The system should not allow duplicate application for same job   |   |
|  |   | Provide ability to determine if applicant has worked for the organization before   |   |
|  |   | The system should have ability to determine if applicants are internal candidates  |   |
|  |   | Allow candidates to subscribe to Autumhire jobs  |   |
|  |   | Ability to capture the age, gender, nationality , current city/country of residence among other details for the applicant  |   |
|  |   | Automatic alert to candidates when they submit their applications  |   |
|  |   | Add a clause that candidates confirm that the information they provide is correct and will be verified and candidates disqualified if it is confirmed to be false  |   |
|  |   |   |   |
| **Long Listing**  |   | Ability to prepare a preliminary long listing by matching applicants details with the job specifications  |   |
|  |   | Ability to define scores for the pre-screening questions   |   |
|  |   | Access to position and candidates specifications for easy referencing  |   |
|  |   | System should assist in online tracking/monitoring of applicants through each stage of the recruitment cycle.  |   |
|  |   | The system should have the query facility to search for one or more applicants and then drill down into their detailed resume information.  |   |
|  |   | The recruitment data bank should hold individual applicants’ CVs containing personal details, competencies, previous work experience and academic attainments.  It should be possible to identify the source of the application.  |   |
|  |   | Facility to execute bulk changes/updates to applicant’s status in one single activity/screen.  |   |
|  |   | The system should support generating reports that identify the best match profiles by comparing required and existing competencies for a job/position.  |   |
|  |   | Ability to share the candidate’s(s) profiles, questionnaire, CV and cover letter through email  |   |
|  |   | Ability to download the applicant’s CVs, cover letters etc. with an automatic renaming as required  |   |
|  |   |   |   |
| **Short Listing**  |   | Allow for sharing of the long list with the hiring manager and panel for purposes of shortlisting  |   |
|  |   | Ability update the status after shortlisting  |   |
|  |   | Functionality for collaboration between the panel members without affecting the results when doing short listing  |   |
|  |   | Provision for rationale and comments to support the shortlisting decisions  |   |
|  |   | Allow for creation of criteria to be used for shortlisting  |   |
|  |   | Allow shortlisted candidates to be fill bio-data online  |   |
|  |   | For every page, have specified duties of the hiring manager  |   |
|  |   |    |   |
| **Interviews**  |   | Ability to load and share interview schedules using interview templates.  |   |
|  |   | Ability to load interview questions  |   |
|  |   | Ability to record interview scores and results with detailed comments.  |   |
|  |   | Support for generation of interview reports  |   |
|  |   |   |   |
|  |   |   |   |
| **Reference checks**  |   | Allow resourcing team to perform reference checks  on the selected candidate  |   |
|  |   | Auto generated reference email picking details from the advert to the referees  |   |
|  |   |   |   |
| **Offers & regrets **  |   | Have a status for  ‘offer accepted’ or ‘offer rejected’ when the candidate accepts or rejects the offer  |   |
|  |   | Send a notification to the hiring manager keeping them updated of the status of the process  |   |
|  |   | Allow status to be updated to ‘Hired’ upon acceptance of the offer by the candidate  |   |
|  |   | Send regret notification to shortlisted candidates who are not hired  |   |
|  |   | There must be a simple mechanism for moving individuals through the recruitment cycle and of the successful candidate into the new employee onboarding processes  |   |
|  |   |   |   |
| **Flexibility**  |   | Has provision for importation of  data from Excel,   documents like photos, referees and email attachments  |   |
|  |   | Calculation functions e.g. calculate number of days, etc.  |   |
|  |   | Sort function, search function etc  |   |
|  |   |   |   |
| **Metrics/ Reports**  |   |   |   |
|  |   | Multiple report views: Spreadsheets, Graphical reports: pie charts, time line, etc.  |   |
|  |   | Recruits per department, directorate, etc  |   |
|  |   | Graphs: Gantt chart, pie charts, bar graphs  |   |
|  |   | Age ratio  |   |
|  |   | Cost per Hire  |   |
|  |   | Time taken to fill position matrix  |   |
|  |   | Vacancy costs  |   |
|  |   | Turnover rate  |   |
|  |   | Source  of job adverts  |   |
|  |   | (30-40 years) Years Hire Ratio; 40-50, 50-60.  |   |
|  |   | Nationality  |   |
|  |   | Ability to support ad-hoc reports  |   |
|  |   | Internal candidates hired ratio  |   |
|  |   | Gender Hire Ratio  |   |
|  |   | Ability to create our own reports  |   |
|  |   |   |   |
| **Security **  |   | No amendments/ deletions on applications by the applicant  |   |
|  |   | No access to unauthorized personnel  |   |
|  |   | Different roles and access levels for Administrators, candidates, hiring managers, etc.  |   |
|  |   | Audit trail for all user actions with time and date  |   |
|  |   |   |   |
| **Backup and recovery **  |   | The system should provide for built in backup and recovery protection  |   |
| **Integration with other systems**  |   | The system should support integration with other systems such as OCS, etc.  |   |
|  |   | The system should provide Web Services (WS) such as WSDL, SOAP, RDF, RSS, etc. Describe the different WS that are "out of the box."  |   |
| **Training**  | 1  | What is the cost of training?  |   |
|  |   | Amount of time required for training  |   |
|  |   |   |   |
| **Data ownership**  |   | Autumhire should own the data  |   |
| **Support & Maintenance**  |   |  Any maintenance and upkeep costs required?  |   |
|  |   | Is the system managed and maintained at Autumhire premises site and by ?Autumhire  |   |
| **Archiving**  |   |  Ability to archive multiple  jobs, candidates, etc.  |   |
| **Location independent **  |   |  Ability to work from multiple locations; Addis, Nairobi, etc.  |   |
| **Government compliance**  |   |  Compliance with regulations such as copyright, etc.  |   |
| **System architecture **  |   | Describe the system architecture  |   |
|  |   | What databases does it support or run on  |   |
|  |   | Is the system a modular solution?  |   |
|  |   | Which browsers and versions of those browsers does the software run on?  |   |
|  |   | What development language(s) would  use to extend/enhance the system?  |   |
| **Reliability **  |   | system checks and reports must be mathematically correct, including ranking of candidates  |   |
| **Data & templates management **  |   | The solution should support various rule sets for managing differing recruitment cycles  |   |
|  |   | Ability to support various templates that can be managed by administrators   |   |
|  |   | The system should have the facility for maintenance of data on recruitment and advertising agents.  |   |
|  |   | Maintain information detailing specific employment activity phases (applicant, exam/test, interview, etc.)  |   |
|  |   | Ability to maintain new hiring data on applicant database for reporting and analysis  |   |
| **What constitutes customer service**  |   |  Such as upgrades, training, etc.  |   |

Payment.

Total : 260,000

[image1]: <data:image/png;base64,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>

[image2]: <data:image/png;base64,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>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAA9CAYAAADF2cvLAAABOUlEQVR4Xu3ZPUoDQQDF8XR6rGyyKcSvCHaeQXAFk1YUDVqJ7S6KXxcQRRQFO0/geUZGeLLMGN9mJ7Nr8R78m4TM/NgiRdLpVFiSFWbl8NFsnn3Uqr93ZZIsf3fPrT0LGp6+ma38s1bp6EagPxOIJRBLIJZALIFYArEEYgnEEoglEEsglkAsgVgCsQRiCcQSiCUQayZQslv07YWsjWCQf6bbD6q3k/fsC8sH995hsUu/f1QvzNL2+ULpOZVRD96HYjUVgzWJohisCVQ6uq6GwYCyf7i4h4U2MwaLgaqNweaJCsZgQK0ePXmXVA3fQ8EYLAQ1dwwG1Nrxs3fptKJhMKDWJy/e5W6D8W1cDFYF1RgGA2p48to+BvsNNRjftYPByqjWMVg3u0gtxNbdv1x0329lFvVvMFrT+wJC7vEqrWlE6QAAAABJRU5ErkJggg==>