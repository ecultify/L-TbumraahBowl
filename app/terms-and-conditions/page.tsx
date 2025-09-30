'use client';

import { BackButton } from '@/components/BackButton';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <div className="relative w-full h-24 bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between h-full px-8 max-w-7xl mx-auto">
          <BackButton />
          <h1 className="text-2xl font-bold text-white">Terms and Conditions</h1>
          <div className="w-12"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <div className="prose prose-invert max-w-none">
              <h1 className="text-3xl font-bold text-white mb-8 text-center">
                TERMS AND CONDITIONS
              </h1>
              
              <div className="text-white/90 space-y-6 text-sm leading-relaxed">
                <p>
                  These Terms and Conditions ("Terms") govern participation in the "Bowl Kar #BumrahkiSpeedPar" Contest ("Contest"), which is being promoted, organized, and managed by L&T Finance Limited ("LTF"), a company incorporated under the provisions of the Companies Act, 1956 and validly existing under the Companies Act, 2013, having its registered and corporate address at Brindavan, Plot No. 177, C.S.T. Road, Kalina, Santa Cruz (East), Mumbai, Maharashtra, 400098.
                </p>
                
                <p>
                  By participating in this Contest, each participant ("Participant"/" You") acknowledges that they have read, understood, and agree to be bound by these Terms, along with any instructions, rules, and additional conditions that may be communicated by LTF from time to time in relation to this Contest. These Terms shall constitute a legally binding agreement between the Participant and LTF.
                </p>
                
                <p>
                  Participation in this Contest is voluntary. If a Participant does not agree with these Terms, they should refrain from participating.
                </p>

                <h2 className="text-xl font-bold text-white mt-8 mb-4">TERMS:</h2>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">1. Eligibility</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Participation is open to all natural persons who are residents of India and 18 years of age or above at the time of entry.</li>
                  <li>Employees, officers, and directors of LTF, its group companies, affiliates, advertising and promotion agencies, campaign partners, and their immediate family members (spouse, parents, children, siblings, and in-laws) are not eligible.</li>
                  <li>Entries on behalf of another person, joint entries, or bulk entries are not permitted.</li>
                  <li>LTF reserves the right to request proof of age, identity, and residence at any stage. Non-compliance will result in disqualification.</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">2. Contest Description</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>The Contest forms part of the L&T Finance Just Zoom Two-Wheeler Loan Campaign.</li>
                  <li>Participants are required to mimic the bowling style of cricketer Jasprit Bumrah and upload a video of their attempt via the dedicated campaign microsite.</li>
                  <li>In addition to mimic the bowling style, the bowling speed achieved by the Participant shall also be considered, and Participants will be required to achieve a minimum bowling speed of [] kmph in order to be eligible for consideration for the Grand Prize.</li>
                  <li>The microsite shall provide:
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>An analysis report of the bowling performance, and</li>
                      <li>A downloadable video summary of the performance.</li>
                    </ul>
                  </li>
                  <li>To qualify:
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Participants must upload the video on the microsite,</li>
                      <li>Provide accurate and complete personal and contact details,</li>
                      <li>Share the video on Instagram by tagging and following the official L&T Finance Instagram page and using the campaign hashtag #BowlKarBumrahKiSpeedPar.</li>
                    </ul>
                  </li>
                  <li>A leaderboard reflecting participant rankings shall be published on the microsite.</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">3. Prizes</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Grand Prize: One (1) winner whose bowling style most closely resembles Jasprit Bumrah's will win a Meet & Greet with Jasprit Bumrah.</li>
                  <li>Next 3 Winners: Bike gloves signed by Jasprit Bumrah.</li>
                  <li>Next 3 Winners: Cricket balls signed by Jasprit Bumrah.</li>
                  <li>Next 3 Winners: Amazon gift vouchers worth INR 5,000 each.</li>
                  <li>Prizes are awarded at the sole discretion of LTF and are non-transferable, non-refundable, and non-exchangeable for cash or any other alternatives.</li>
                  <li>Travel & Accommodation: For the Grand Prize winner, all reasonable travel, lodging and related expenses incurred for attending the Meet & Greet shall be arranged and borne by LTF. Any incidental or personal expenses (e.g., meals outside official arrangements, personal shopping, additional stay requests, etc.) shall be the sole responsibility of the winner.</li>
                  <li>LTF reserves the right to substitute prizes with items of equal or greater commercial value without prior notice.</li>
                  <li>Taxes, levies, or charges applicable on prizes, if any, shall be borne by the winners.</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">4. Consent, Publicity & Use of Submissions</h3>
                <p>By entering this Contest, participants expressly:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Grant LTF and its authorized representatives, agents, affiliates, and media partners an irrevocable, worldwide, royalty-free license to use, reproduce, publish, broadcast, adapt, and distribute:
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Their name, image, likeness, video submissions, voice, performance data, and social media handles; and</li>
                      <li>Contest-related materials submitted by them.</li>
                    </ul>
                  </li>
                  <li>Acknowledge that such use may be for purposes including (but not limited to):
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Marketing and advertising,</li>
                      <li>Publicity and brand promotion,</li>
                      <li>Campaign analysis and reporting,</li>
                      <li>Display on digital platforms, social media, print, and television.</li>
                    </ul>
                  </li>
                  <li>Consent to such use without additional consideration, approval, or compensation.</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">5. Data Protection & Privacy</h3>
                
                <h4 className="text-base font-semibold text-white mt-4 mb-2">a. Data Collection:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>LTF shall collect personal data such as participant's name, contact details, social media handles, video submissions, and performance data.</li>
                  <li>Participation implies consent to provide accurate personal data, which is necessary for Contest administration and prize fulfilment.</li>
                </ul>

                <h4 className="text-base font-semibold text-white mt-4 mb-2">b. Purpose of Processing:</h4>
                <p>Personal data will be processed for:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Conducting and administering the Contest,</li>
                  <li>Verifying eligibility and identity,</li>
                  <li>Communicating with participants regarding entries and prizes,</li>
                  <li>Marketing, publicity, and promotional activities of LTF (where consented)</li>
                  <li>Compliance with applicable laws and regulatory directions.</li>
                </ul>
                <p className="mt-2">Processing is based on the participant's consent and LTF's legitimate interests in administering the Contest and conducting associated marketing activities.</p>

                <h4 className="text-base font-semibold text-white mt-4 mb-2">c. Data Sharing & Disclosure:</h4>
                <p>Personal data may be shared with:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>LTF's affiliates, group companies, and authorized partners,</li>
                  <li>Service providers engaged for campaign operations (IT vendors, social media partners, prize distributors),</li>
                  <li>Regulators, enforcement agencies, or courts, where disclosure is required by law.</li>
                  <li>All third parties shall be bound by strict confidentiality and data protection obligations.</li>
                </ul>

                <h4 className="text-base font-semibold text-white mt-4 mb-2">d. Data Security:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>LTF implements industry-standard technical and organizational security measures to safeguard personal data against unauthorized access, disclosure, alteration, or destruction.</li>
                  <li>Measures include encryption, restricted access, and secure retention protocols.</li>
                </ul>

                <h4 className="text-base font-semibold text-white mt-4 mb-2">e. Data Retention:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Personal data will be retained only as long as reasonably necessary for Contest purposes, compliance with applicable laws, and legitimate business needs.</li>
                  <li>Thereafter, data will be securely anonymized or deleted.</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">6. Ownership & Intellectual Property Rights</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>All Contest submissions, including videos, analysis reports, and related content, shall become the exclusive property of LTF.</li>
                  <li>Participants warrant that submissions are original and do not infringe upon third-party intellectual property rights.</li>
                  <li>LTF shall have full rights to reproduce, adapt, edit, modify, publish, and use such content for marketing, commercial, or archival purposes without further notice or approval.</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">7. Restrictions & Disqualification</h3>
                
                <h4 className="text-base font-semibold text-white mt-4 mb-2">a. Submissions must not contain:</h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Obscene, offensive, defamatory, or unlawful material,</li>
                  <li>Content infringing the intellectual property, moral, or publicity rights of third parties,</li>
                  <li>Politically sensitive or religiously offensive content.</li>
                </ul>

                <h4 className="text-base font-semibold text-white mt-4 mb-2">b. LTF reserves the right to disqualify entries that:</h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Violate these Terms,</li>
                  <li>Are incomplete, inaccurate, or fraudulent,</li>
                  <li>Attempt to manipulate results, hack the microsite, or gain unfair advantage.</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">8. Limitation of Liability</h3>
                <p>LTF shall not be liable for:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Technical glitches, network outages, or data corruption during submissions,</li>
                  <li>Any loss, injury, or damage (direct, indirect, incidental, or consequential) arising from participation or prize use,</li>
                  <li>Force Majeure events, including acts of God, strikes, lockouts, or system failures.</li>
                </ul>
                <p className="mt-2">Participants agree to indemnify and hold harmless LTF, its affiliates, and agents from any claims arising out of breach of these Terms or misuse of intellectual property in submissions.</p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">9. Amendments, Suspension & Termination</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>LTF reserves the right to amend, suspend, or terminate the Contest or these Terms, wholly or partly, at any time, without prior notice, if deemed necessary for business, legal, or regulatory reasons.</li>
                  <li>Such decisions shall be final and binding on all participants.</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">10. Governing Law & Dispute Resolution</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>These Terms shall be governed by the laws of India.</li>
                  <li>Any disputes, claims, or controversies shall be subject to the exclusive jurisdiction of the competent courts at Mumbai, Maharashtra, India.</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">11. Contact Information</h3>
                <p>For queries, clarifications, or complaints regarding the Contest, participants may contact:</p>
                <div className="mt-2 p-4 bg-white/5 rounded-lg">
                  <p className="font-semibold">Customer Support Team L&T Finance Limited</p>
                  <p>Website: []</p>
                  <p>Email: []</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
