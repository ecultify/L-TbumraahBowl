'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TermsAndConditions() {
  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <>
      <style jsx global>{`
        @font-face {
          font-family: 'Frutiger';
          src: url('/fonts/frutiger/Frutiger.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        
        @font-face {
          font-family: 'Frutiger';
          src: url('/fonts/frutiger/Frutiger_bold.ttf') format('truetype');
          font-weight: bold;
          font-style: normal;
        }
      `}</style>
      
      <div 
        className="min-h-screen flex flex-col"
        style={{
          backgroundImage: 'url("/images/newhomepage/front%20bg.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          fontFamily: "'Frutiger', Arial, sans-serif"
        }}
      >
        {/* Header */}
        <div className="relative w-full h-24 bg-black/20 backdrop-blur-sm border-b border-white/10">
          <div className="flex items-center justify-between h-full px-8 max-w-7xl mx-auto">
            <button 
              onClick={handleBack}
              className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
              style={{ fontFamily: "'Frutiger', Arial, sans-serif" }}
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
            <h1 
              className="text-2xl font-bold text-white"
              style={{ fontFamily: "'Frutiger', Arial, sans-serif" }}
            >
              Terms and Conditions
            </h1>
            <div className="w-12"></div> {/* Spacer for centering */}
          </div>
        </div>

        {/* Content */}
        <div className="w-full px-4 md:px-8 py-8 md:py-12 flex-1">
          <div className="max-w-5xl mx-auto">
            <div 
              className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 md:p-10 border border-gray-200 shadow-2xl"
              style={{ fontFamily: "'Frutiger', Arial, sans-serif" }}
            >
              <div className="prose max-w-none">
                <h1 
                  className="text-2xl md:text-4xl font-bold text-center mb-8"
                  style={{ 
                    color: '#000000',
                    fontFamily: "'Frutiger', Arial, sans-serif",
                    letterSpacing: '-0.02em'
                  }}
                >
                  TERMS AND CONDITIONS
                </h1>
                
                <div 
                  className="space-y-6 text-sm md:text-base leading-relaxed"
                  style={{ 
                    color: '#000000',
                    fontFamily: "'Frutiger', Arial, sans-serif"
                  }}
                >
                  <p>
                    These Terms and Conditions ("Terms") govern participation in the "Bowl Kar #BumrahkiSpeedPar" Contest ("Contest"), which is being promoted, organized, and managed by L&T Finance Limited ("LTF"), a company incorporated under the provisions of the Companies Act, 1956 and validly existing under the Companies Act, 2013, having its registered and corporate address at Brindavan, Plot No. 177, C.S.T. Road, Kalina, Santa Cruz (East), Mumbai, Maharashtra, 400098.
                  </p>
                  
                  <p>
                    By participating in this Contest, each participant ("Participant"/" You") acknowledges that they have read, understood, and agree to be bound by these Terms, along with any instructions, rules, and additional conditions that may be communicated by LTF from time to time in relation to this Contest. These Terms shall constitute a legally binding agreement between the Participant and LTF.
                  </p>
                  
                  <p>
                    Participation in this Contest is voluntary. If a Participant does not agree with these Terms, they should refrain from participating.
                  </p>

                  <h2 
                    className="text-xl md:text-2xl font-bold mt-10 mb-6"
                    style={{ 
                      color: '#000000',
                      fontFamily: "'Frutiger', Arial, sans-serif"
                    }}
                  >
                    TERMS:
                  </h2>

                  <div className="space-y-8">
                    {/* Section 1 */}
                    <div>
                      <h3 
                        className="text-lg md:text-xl font-bold mb-4"
                        style={{ 
                          color: '#000000',
                          fontFamily: "'Frutiger', Arial, sans-serif"
                        }}
                      >
                        1. Eligibility
                      </h3>
                      <ul className="list-disc pl-6 space-y-3" style={{ color: '#000000' }}>
                        <li>Participation is open to all natural persons who are residents of India and 18 years of age or above at the time of entry.</li>
                        <li>Entries on behalf of another person, joint entries, or bulk entries are not permitted.</li>
                        <li>LTF reserves the right to request proof of age, identity, and residence at any stage. Non-compliance will result in disqualification.</li>
                      </ul>
                    </div>

                    {/* Section 2 */}
                    <div>
                      <h3 
                        className="text-lg md:text-xl font-bold mb-4"
                        style={{ 
                          color: '#000000',
                          fontFamily: "'Frutiger', Arial, sans-serif"
                        }}
                      >
                        2. Contest Description
                      </h3>
                      <ul className="list-disc pl-6 space-y-3" style={{ color: '#000000' }}>
                        <li>The Contest forms part of the L&T Finance Just Zoom Two-Wheeler Loan Campaign.</li>
                        <li>Participants are required to mimic the bowling style of cricketer Jasprit Bumrah and upload a video of their attempt via the dedicated campaign microsite.</li>
                        <li>In addition to mimic the bowling style, the bowling speed achieved by the Participant shall also be considered, and Participants will be required to match the bowling style of Jasprit Bumrah in order to be eligible for consideration for the Grand Prize.</li>
                        <li>The microsite shall provide:
                          <ul className="list-disc pl-6 mt-2 space-y-2">
                            <li>An analysis report of the bowling performance, and</li>
                            <li>A downloadable video summary of the performance.</li>
                          </ul>
                        </li>
                        <li>To qualify:
                          <ul className="list-disc pl-6 mt-2 space-y-2">
                            <li>Participants must upload the video on the microsite,</li>
                            <li>Provide accurate and complete personal and contact details,</li>
                            <li>Share the video on Instagram by tagging and following the official L&T Finance Instagram page and using the campaign hashtag #BowlKarBumrahKiSpeedPar.</li>
                          </ul>
                        </li>
                        <li>A leaderboard reflecting participant rankings shall be published on the microsite.</li>
                      </ul>
                    </div>

                    {/* Section 3 */}
                    <div>
                      <h3 
                        className="text-lg md:text-xl font-bold mb-4"
                        style={{ 
                          color: '#000000',
                          fontFamily: "'Frutiger', Arial, sans-serif"
                        }}
                      >
                        3. Prizes
                      </h3>
                      <ul className="list-disc pl-6 space-y-3" style={{ color: '#000000' }}>
                        <li>Grand Prize: One (1) winner whose bowling style most closely resembles Jasprit Bumrah's will win a Meet & Greet with Jasprit Bumrah.</li>
                        <li>Next 3 Winners: Bike gloves signed by Jasprit Bumrah.</li>
                        <li>Next 3 Winners: Cricket balls signed by Jasprit Bumrah.</li>
                        <li>Next 3 Winners: Amazon gift vouchers worth INR 5,000 each.</li>
                        <li>Prizes are awarded at the sole discretion of LTF and are non-transferable, non-refundable, and non-exchangeable for cash or any other alternatives.</li>
                        <li>Travel & Accommodation: For the Grand Prize winner, all reasonable travel, lodging and related expenses incurred for attending the Meet & Greet shall be arranged and borne by LTF. Any incidental or personal expenses (e.g., meals outside official arrangements, personal shopping, additional stay requests, etc.) shall be the sole responsibility of the winner.</li>
                        <li>LTF reserves the right to substitute prizes with items of equal or greater commercial value without prior notice.</li>
                        <li>Taxes, levies, or charges applicable on prizes, if any, shall be borne by the winners.</li>
                      </ul>
                    </div>

                    {/* Section 4 */}
                    <div>
                      <h3 
                        className="text-lg md:text-xl font-bold mb-4"
                        style={{ 
                          color: '#000000',
                          fontFamily: "'Frutiger', Arial, sans-serif"
                        }}
                      >
                        4. Consent, Publicity & Use of Submissions
                      </h3>
                      <p className="mb-3">By entering this Contest, participants expressly:</p>
                      <ul className="list-disc pl-6 space-y-3" style={{ color: '#000000' }}>
                        <li>Grant LTF and its authorized representatives, agents, affiliates, and media partners an irrevocable, worldwide, royalty-free license to use, reproduce, publish, broadcast, adapt, and distribute:
                          <ul className="list-disc pl-6 mt-2 space-y-2">
                            <li>Their name, image, likeness, video submissions, voice, performance data, and social media handles; and</li>
                            <li>Contest-related materials submitted by them.</li>
                          </ul>
                        </li>
                        <li>Acknowledge that such use may be for purposes including (but not limited to):
                          <ul className="list-disc pl-6 mt-2 space-y-2">
                            <li>Marketing and advertising,</li>
                            <li>Publicity and brand promotion,</li>
                            <li>Campaign analysis and reporting,</li>
                            <li>Display on digital platforms, social media, print, and television.</li>
                          </ul>
                        </li>
                        <li>Consent to such use without additional consideration, approval, or compensation.</li>
                      </ul>
                    </div>

                    {/* Section 5 */}
                    <div>
                      <h3 
                        className="text-lg md:text-xl font-bold mb-4"
                        style={{ 
                          color: '#000000',
                          fontFamily: "'Frutiger', Arial, sans-serif"
                        }}
                      >
                        5. Data Protection & Privacy
                      </h3>
                      
                      <div className="space-y-5">
                        <div>
                          <h4 
                            className="text-base md:text-lg font-bold mb-3"
                            style={{ 
                              color: '#000000',
                              fontFamily: "'Frutiger', Arial, sans-serif"
                            }}
                          >
                            a. Data Collection:
                          </h4>
                          <ul className="list-disc pl-6 space-y-2" style={{ color: '#000000' }}>
                            <li>LTF shall collect personal data such as participant's name, contact details, social media handles, video submissions, and performance data.</li>
                            <li>Participation implies consent to provide accurate personal data, which is necessary for Contest administration and prize fulfilment.</li>
                          </ul>
                        </div>

                        <div>
                          <h4 
                            className="text-base md:text-lg font-bold mb-3"
                            style={{ 
                              color: '#000000',
                              fontFamily: "'Frutiger', Arial, sans-serif"
                            }}
                          >
                            b. Purpose of Processing:
                          </h4>
                          <p className="mb-2">Personal data will be processed for:</p>
                          <ul className="list-disc pl-6 space-y-2" style={{ color: '#000000' }}>
                            <li>Conducting and administering the Contest,</li>
                            <li>Verifying eligibility and identity,</li>
                            <li>Communicating with participants regarding entries and prizes,</li>
                            <li>Marketing, publicity, and promotional activities of LTF (where consented)</li>
                            <li>Compliance with applicable laws and regulatory directions.</li>
                          </ul>
                          <p className="mt-3">Processing is based on the participant's consent and LTF's legitimate interests in administering the Contest and conducting associated marketing activities.</p>
                        </div>

                        <div>
                          <h4 
                            className="text-base md:text-lg font-bold mb-3"
                            style={{ 
                              color: '#000000',
                              fontFamily: "'Frutiger', Arial, sans-serif"
                            }}
                          >
                            c. Data Sharing & Disclosure:
                          </h4>
                          <p className="mb-2">Personal data may be shared with:</p>
                          <ul className="list-disc pl-6 space-y-2" style={{ color: '#000000' }}>
                            <li>LTF's affiliates, group companies, and authorized partners,</li>
                            <li>Service providers engaged for campaign operations (IT vendors, social media partners, prize distributors),</li>
                            <li>Regulators, enforcement agencies, or courts, where disclosure is required by law.</li>
                            <li>All third parties shall be bound by strict confidentiality and data protection obligations.</li>
                          </ul>
                        </div>

                        <div>
                          <h4 
                            className="text-base md:text-lg font-bold mb-3"
                            style={{ 
                              color: '#000000',
                              fontFamily: "'Frutiger', Arial, sans-serif"
                            }}
                          >
                            d. Data Security:
                          </h4>
                          <ul className="list-disc pl-6 space-y-2" style={{ color: '#000000' }}>
                            <li>LTF implements industry-standard technical and organizational security measures to safeguard personal data against unauthorized access, disclosure, alteration, or destruction.</li>
                            <li>Measures include encryption, restricted access, and secure retention protocols.</li>
                          </ul>
                        </div>

                        <div>
                          <h4 
                            className="text-base md:text-lg font-bold mb-3"
                            style={{ 
                              color: '#000000',
                              fontFamily: "'Frutiger', Arial, sans-serif"
                            }}
                          >
                            e. Data Retention:
                          </h4>
                          <ul className="list-disc pl-6 space-y-2" style={{ color: '#000000' }}>
                            <li>Personal data will be retained only as long as reasonably necessary for Contest purposes, compliance with applicable laws, and legitimate business needs.</li>
                            <li>Thereafter, data will be securely anonymized or deleted.</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Section 6 */}
                    <div>
                      <h3 
                        className="text-lg md:text-xl font-bold mb-4"
                        style={{ 
                          color: '#000000',
                          fontFamily: "'Frutiger', Arial, sans-serif"
                        }}
                      >
                        6. Ownership & Intellectual Property Rights
                      </h3>
                      <ul className="list-disc pl-6 space-y-3" style={{ color: '#000000' }}>
                        <li>All Contest submissions, including videos, analysis reports, and related content, shall become the exclusive property of LTF.</li>
                        <li>Participants warrant that submissions are original and do not infringe upon third-party intellectual property rights.</li>
                        <li>LTF shall have full rights to reproduce, adapt, edit, modify, publish, and use such content for marketing, commercial, or archival purposes without further notice or approval.</li>
                      </ul>
                    </div>

                    {/* Section 7 */}
                    <div>
                      <h3 
                        className="text-lg md:text-xl font-bold mb-4"
                        style={{ 
                          color: '#000000',
                          fontFamily: "'Frutiger', Arial, sans-serif"
                        }}
                      >
                        7. Restrictions & Disqualification
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 
                            className="text-base md:text-lg font-bold mb-2"
                            style={{ 
                              color: '#000000',
                              fontFamily: "'Frutiger', Arial, sans-serif"
                            }}
                          >
                            a. Submissions must not contain:
                          </h4>
                          <ul className="list-disc pl-6 space-y-2" style={{ color: '#000000' }}>
                            <li>Obscene, offensive, defamatory, or unlawful material,</li>
                            <li>Content infringing the intellectual property, moral, or publicity rights of third parties,</li>
                            <li>Politically sensitive or religiously offensive content.</li>
                          </ul>
                        </div>

                        <div>
                          <h4 
                            className="text-base md:text-lg font-bold mb-2"
                            style={{ 
                              color: '#000000',
                              fontFamily: "'Frutiger', Arial, sans-serif"
                            }}
                          >
                            b. LTF reserves the right to disqualify entries that:
                          </h4>
                          <ul className="list-disc pl-6 space-y-2" style={{ color: '#000000' }}>
                            <li>Violate these Terms,</li>
                            <li>Are incomplete, inaccurate, or fraudulent,</li>
                            <li>Attempt to manipulate results, hack the microsite, or gain unfair advantage.</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Section 8 */}
                    <div>
                      <h3 
                        className="text-lg md:text-xl font-bold mb-4"
                        style={{ 
                          color: '#000000',
                          fontFamily: "'Frutiger', Arial, sans-serif"
                        }}
                      >
                        8. Limitation of Liability
                      </h3>
                      <p className="mb-3">LTF shall not be liable for:</p>
                      <ul className="list-disc pl-6 space-y-2" style={{ color: '#000000' }}>
                        <li>Technical glitches, network outages, or data corruption during submissions,</li>
                        <li>Any loss, injury, or damage (direct, indirect, incidental, or consequential) arising from participation or prize use,</li>
                        <li>Force Majeure events, including acts of God, strikes, lockouts, or system failures.</li>
                      </ul>
                      <p className="mt-3">Participants agree to indemnify and hold harmless LTF, its affiliates, and agents from any claims arising out of breach of these Terms or misuse of intellectual property in submissions.</p>
                    </div>

                    {/* Section 9 */}
                    <div>
                      <h3 
                        className="text-lg md:text-xl font-bold mb-4"
                        style={{ 
                          color: '#000000',
                          fontFamily: "'Frutiger', Arial, sans-serif"
                        }}
                      >
                        9. Amendments, Suspension & Termination
                      </h3>
                      <ul className="list-disc pl-6 space-y-3" style={{ color: '#000000' }}>
                        <li>LTF reserves the right to amend, suspend, or terminate the Contest or these Terms, wholly or partly, at any time, without prior notice, if deemed necessary for business, legal, or regulatory reasons.</li>
                        <li>Such decisions shall be final and binding on all participants.</li>
                      </ul>
                    </div>

                    {/* Section 10 */}
                    <div>
                      <h3 
                        className="text-lg md:text-xl font-bold mb-4"
                        style={{ 
                          color: '#000000',
                          fontFamily: "'Frutiger', Arial, sans-serif"
                        }}
                      >
                        10. Governing Law & Dispute Resolution
                      </h3>
                      <ul className="list-disc pl-6 space-y-3" style={{ color: '#000000' }}>
                        <li>These Terms shall be governed by the laws of India.</li>
                        <li>Any disputes, claims, or controversies shall be subject to the exclusive jurisdiction of the competent courts at Mumbai, Maharashtra, India.</li>
                      </ul>
                    </div>

                    {/* Section 11 */}
                    <div>
                      <h3 
                        className="text-lg md:text-xl font-bold mb-4"
                        style={{ 
                          color: '#000000',
                          fontFamily: "'Frutiger', Arial, sans-serif"
                        }}
                      >
                        11. Contact Information
                      </h3>
                      <p className="mb-4">For queries, clarifications, or complaints regarding the Contest, participants may contact:</p>
                      <div 
                        className="mt-3 p-6 bg-blue-50 border-l-4 border-blue-500 rounded-lg"
                        style={{ 
                          color: '#000000',
                          fontFamily: "'Frutiger', Arial, sans-serif"
                        }}
                      >
                        <p className="font-bold text-lg mb-2">Customer Support Team</p>
                        <p className="font-semibold">L&T Finance Limited</p>
                        <p className="mt-2">Website: <a href="https://www.ltfinance.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline font-semibold">www.LTFINANCE.com</a></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full bg-black px-4 md:px-8 pt-4 pb-6 mt-auto">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4 md:gap-6 max-w-7xl mx-auto">
            <div className="text-left">
              <p 
                className="text-white text-xs"
                style={{
                  fontFamily: "'Frutiger', Arial, sans-serif",
                  fontWeight: '400',
                  fontSize: 'clamp(10px, 2vw, 14px)',
                  lineHeight: '1.4'
                }}
              >
                © L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833 | <Link href="/terms-and-conditions" className="text-blue-300 hover:text-blue-200 underline">Terms and Conditions</Link>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span 
                className="text-white text-xs mr-2"
                style={{
                  fontFamily: "'Frutiger', Arial, sans-serif",
                  fontWeight: '400',
                  fontSize: 'clamp(10px, 2vw, 14px)'
                }}
              >
                Connect with us
              </span>
              <div className="flex gap-3 md:gap-4">
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
