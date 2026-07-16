# Save This Life Database Research and Acquisition Plan

## Bottom line

As of July 16, 2026, I found no credible evidence that the complete Save This Life microchip database was:

- transferred to another registry,
- purchased by a successor,
- restored through AAHA,
- published as a downloadable dataset, or
- disclosed in a known public breach.

The strongest evidence still points to the database being offline and stranded—not necessarily destroyed. AAHA’s current guidance still says Save This Life was disconnected, and it explicitly clarifies that AAHA’s lookup system does not store pet-owner information; it only identifies which registry may hold it. [AAHA Microchip Registry Lookup](https://www.aaha.org/for-veterinary-professionals/microchip-registry-lookup-tool-aaha-find-your-pets-microchip-registry/)

The Washington Post reported that PetLink approached Covetrus about salvaging the database but received no response. I found no later announcement that this effort succeeded. [Washington Post investigation](https://www.washingtonpost.com/business/2025/02/13/savethislife-pet-chips/)

The AVMA page itself blocked automated retrieval, but its core description is reproduced in a veterinary newsletter and independently confirmed by AAHA: Save This Life closed, searches failed, and affected owners were told to re-register. [AVMA article](https://www.avma.org/news/microchip-companys-closure-means-pet-owners-will-need-reregister-their-pets-microchips), [newsletter reproduction](https://myemail.constantcontact.com/The-March-2025-Newsletter-is-here-.html?aid=06eNuybVbs8&soid=1107787238084)

## What has surfaced

There are several fragments and custody leads, but none is the complete database:

1. **Veterinary-clinic subsets.** Clinics often retain chip numbers and owner records in their own practice systems. One hospital reportedly identified 2,941 affected pets; another built a lookup table from its internal records. These could support reconstruction, but they are fragmented and independently controlled. [Washington Post](https://www.washingtonpost.com/business/2025/02/13/savethislife-pet-chips/), [Ghent Veterinary Hospital](https://www.ghentvet.com/save-life-microchip)

2. **Distributor trackback records.** Covetrus exclusively distributed the product and likely has purchase orders, chip-lot allocations, and clinic/customer account information. That is probably not pet-owner registration data, but it could identify which clinics received particular chip ranges. [Covetrus product material](https://northamerica.covetrus.com/Content/pdfs/P068535.pdf)

3. **Former operating systems.** A historical public scan shows a password-protected Save This Life portal at `po.savethislife.com`, hosted on Google Cloud in 2023. Search results also identify `app.savethislife.com`, a Zoho help center, and `microchipcsr.com`. A former technical lead publicly states that he built and maintained a customer-service portal used by more than 60 representatives. These are strong custodian leads—not evidence of public exposure. [Historical portal scan](https://urlscan.io/result/0588ff47-f896-44c6-af71-a9702f5d1b7c/), [technical lead’s public profile](https://www.freelancer.es/u/murrelljohnson)

4. **Search-engine landing pages.** Save This Life patented a system in which searching a chip number produced a contact-relay page. Individual record landing pages may once have been indexed or archived, but I found no usable bulk corpus. Harvesting any archived owner information would also create serious privacy and provenance problems. [Save This Life patent](https://patents.justia.com/assignee/save-this-life-inc)

5. **The old domain is unsafe.** `savethislife.com` has since been repurposed or compromised and now serves/redirects unrelated Vietnamese sports-streaming content. It should not be treated as a legitimate recovery or contact channel. [Current domain analysis](https://www.scamadviser.com/check-website-old/savethislife.com)

## Recommended strategy

The best path is **custodian recovery first, negotiated acquisition second, opt-in reconstruction third**.

### Phase 1: Establish ownership and authority

Before requesting any records:

1. Obtain certified Texas Secretary of State filings for Save This Life, Inc., entity ID `801532117`, including its formation, amendments, registered-agent history, forfeiture, and latest public-information reports. Public aggregators identify Christian R. White and Lucy B. Hope as officers, but certified records are needed. [Corporate record summary](https://www.corporationwiki.com/Texas/Austin/save-this-life-inc/101277641.aspx)

2. Search:

   - Texas Comptroller forfeiture and reinstatement records;
   - Texas UCC filings for secured creditors;
   - federal PACER/RECAP for bankruptcy or receivership;
   - Travis County civil cases and judgments;
   - Texas Attorney General and FTC enforcement records;
   - lawsuits or disputes involving Covetrus, payment processors, landlords, or former contractors.

3. Determine who can legally convey the assets: an officer winding up the corporation, a secured creditor, receiver, trustee, or another successor.

4. Retrieve the historical Save This Life privacy policy, registration terms, clinic agreements, and vendor contracts. These determine whether owner data may be transferred and for what purpose.

### Phase 2: Immediate preservation campaign

Through counsel, send narrowly written preservation requests—not demands for disclosure—to:

- Christian “Chance” White and Lucy Byrd Hope;
- the former technical lead and any identified COO;
- Google Cloud;
- GoDaddy and the historical Cloudflare account holder;
- Shopify;
- Zoho;
- database, backup, email, SMS, CRM, and payment vendors identified from invoices or former staff;
- Covetrus;
- AAHA and PetLink.

Ask each party to preserve:

- database snapshots and automated backups;
- object-storage exports;
- schemas, source code, and deployment configuration;
- audit and access logs;
- chip inventory/range allocation tables;
- registration imports and exports;
- vendor invoices and account identifiers;
- privacy policies and customer-consent records.

Cloud providers generally will not release customer data to an unrelated party, but preservation buys time while ownership or court authority is established.

### Phase 3: Technical custody interviews

Interview former officers, developers, operations staff, and customer-service managers using a fixed questionnaire:

- What database engine and Google Cloud project were used?
- Was production hosted under a corporate or personal account?
- Where were backups stored, and what was their retention period?
- Were there exports to AAHA, Covetrus, CRM, SMS, insurance, or support vendors?
- Who held the encryption keys and billing account?
- Was data deleted, merely disconnected, or lost through nonpayment?
- Was a final export made before shutdown?
- Did any creditor or vendor seize or retain systems?

The historical Google Cloud portal makes former technical staff and billing administrators the highest-value initial interviews.

### Phase 4: Acquisition structure

If an intact copy exists, pursue a documented asset transfer containing:

- clear chain of title;
- the database, schema, source code, trademarks, domains, and necessary goodwill—not personal data as an isolated list;
- warranties about completeness, prior breaches, liens, and deletion;
- transfer of relevant vendor accounts where possible;
- continued application of the original privacy promises;
- affirmative owner consent for materially new uses;
- notice, correction, deletion, and opt-out procedures;
- an independent security assessment before importing anything;
- deletion of payment credentials and unrelated marketing data;
- encrypted quarantine until provenance and integrity are verified.

FTC precedent strongly disfavors selling customer information as a standalone asset contrary to the original privacy promises. A related successor continuing the same pet-recovery purpose is much more defensible, particularly with owner notice and opt-in for changed uses. [FTC Toysmart settlement](https://www.ftc.gov/news-events/news/press-releases/2000/07/ftc-announces-settlement-bankrupt-website-toysmartcom-regarding-alleged-privacy-policy-violations), [FTC Borders guidance](https://www.ftc.gov/news-events/news/press-releases/2011/09/ftc-seeks-protection-personal-customer-information-borders-bankruptcy-proceeding)

### Phase 5: Reconstruction if the central database is unrecoverable

Build a new, consent-based registry from authoritative fragments:

1. Obtain chip-range and clinic-allocation records from Covetrus and other distributors.
2. Invite clinics and shelters to contribute only records they are authorized to transfer.
3. Contact owners through the clinic that already has a relationship with them.
4. Require the owner to verify possession of the animal or supporting records and explicitly enroll in the new registry.
5. Query active registries through approved AAHA participation rather than scraping them.
6. Deduplicate by normalized chip ID while preserving provenance for every field.
7. Treat conflicting ownership claims as manual-review cases.
8. Publish aggregate progress—never owner contact information or a bulk chip-number list.

This will not perfectly reproduce the old database, but it can create a higher-integrity replacement without inheriting questionable records.

## Suggested decision gates

- **Gate 1:** Is there a legally authorized seller or custodian?
- **Gate 2:** Does an intact backup exist?
- **Gate 3:** Can its ownership and privacy provenance be demonstrated?
- **Gate 4:** Can it be transferred for the same pet-recovery purpose?
- **Gate 5:** If any answer is no, switch from acquisition to opt-in reconstruction.

The most promising first move is a coordinated preservation-and-custody inquiry involving the former principals, former technical lead, Google Cloud account trail, Covetrus, PetLink, and AAHA. Public-web searching is now unlikely to produce the database itself; the remaining path runs through corporate records, former operators, infrastructure providers, and lawful owner re-enrollment.
