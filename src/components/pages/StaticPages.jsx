import React from 'react';
import { Info, Mail, HelpCircle, FileText, Shield } from 'lucide-react';

export const AboutPage = () => (
  <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-rose-50 py-12">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Info className="h-8 w-8 text-amber-600" />
          <h1 className="text-4xl font-bold text-gray-800">About Virtual Art</h1>
        </div>
        <div className="prose max-w-none">
          <p className="text-lg text-gray-700 mb-4">
            Welcome to Virtual Art, the premier online marketplace connecting talented artists with
            art enthusiasts around the world.
          </p>
          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-3">Our Mission</h2>
          <p className="text-gray-700 mb-4">
            We believe that art should be accessible to everyone. Our platform empowers artists to
            showcase their work and reach a global audience, while providing collectors and art
            lovers with a curated selection of unique, authentic pieces.
          </p>
          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-3">Why Choose Us?</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
            <li>Verified artists and authentic artwork</li>
            <li>Secure payment processing</li>
            <li>Direct connection between artists and buyers</li>
            <li>Transparent pricing with no hidden fees</li>
            <li>Quality customer support</li>
          </ul>
          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-3">Our Community</h2>
          <p className="text-gray-700">
            Join thousands of artists and art collectors who have made Virtual Art their home for
            discovering, sharing, and purchasing exceptional artwork. Whether you're an emerging
            artist or an established collector, we're here to support your artistic journey.
          </p>
        </div>

        {/* Attribution Section */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6">
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              VR Gallery environment/model used in this project is licensed under Creative Commons Attribution 4.0 International (CC BY 4.0).
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Original resource creators retain ownership of their work.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              This project uses modified/adapted gallery assets under the CC BY 4.0 license:
              <br />
              <a 
                href="https://creativecommons.org/licenses/by/4.0/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-amber-600 hover:text-amber-700 underline font-medium transition-colors"
              >
                https://creativecommons.org/licenses/by/4.0/
              </a>
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Changes may have been made to optimize and integrate the gallery into the VisualArt VR marketplace project.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ContactPage = () => (
  <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-rose-50 py-12">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="h-8 w-8 text-amber-600" />
          <h1 className="text-4xl font-bold text-gray-800">Contact Us</h1>
        </div>
        <p className="text-lg text-gray-700 mb-8">
          Have questions or need assistance? We're here to help!
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Get in Touch</h2>
            <div className="space-y-3 text-gray-700">
              <p>
                <strong>Email:</strong> support@virtualart.com
              </p>
              <p>
                <strong>Phone:</strong> +1 (555) 123-4567
              </p>
              <p>
                <strong>Hours:</strong> Mon-Fri, 9AM-6PM EST
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Visit Us</h2>
            <p className="text-gray-700">
              Virtual Art Headquarters
              <br />
              123 Gallery Street
              <br />
              New York, NY 10001
              <br />
              United States
            </p>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Send us a Message</h2>
          <form className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Your Name"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <input
                type="email"
                placeholder="Your Email"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <input
              type="text"
              placeholder="Subject"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <textarea
              placeholder="Your Message"
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-lg hover:shadow-lg transition-shadow"
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
);

export const HelpPage = () => (
  <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-rose-50 py-12">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <HelpCircle className="h-8 w-8 text-amber-600" />
          <h1 className="text-4xl font-bold text-gray-800">Help Center</h1>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">For Buyers</h2>
            <div className="space-y-3">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-gray-800 mb-2">How do I purchase artwork?</h3>
                <p className="text-gray-700">
                  Browse our gallery, click on an artwork you like, and follow the checkout process.
                  All purchases are secure and protected.
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-gray-800 mb-2">What payment methods do you accept?</h3>
                <p className="text-gray-700">
                  We accept all major credit cards, PayPal, and bank transfers for purchases over
                  ₹1000.
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-gray-800 mb-2">How does shipping work?</h3>
                <p className="text-gray-700">
                  Artists handle shipping directly. Shipping costs and timelines are displayed before
                  purchase completion.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">For Artists</h2>
            <div className="space-y-3">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-gray-800 mb-2">How do I start selling?</h3>
                <p className="text-gray-700">
                  Create an artist account, complete your profile, and start uploading your artwork.
                  Each piece goes through a quick review process.
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-gray-800 mb-2">What are the fees?</h3>
                <p className="text-gray-700">
                  We charge a 15% commission on each sale. There are no listing fees or monthly
                  charges.
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-gray-800 mb-2">When do I get paid?</h3>
                <p className="text-gray-700">
                  Payments are processed within 2-3 business days after the buyer receives and
                  confirms the artwork.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const TermsPage = () => (
  <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-rose-50 py-12">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="h-8 w-8 text-amber-600" />
          <h1 className="text-4xl font-bold text-gray-800">Terms & Conditions</h1>
        </div>

        <div className="prose max-w-none">
          <p className="text-sm text-gray-600 mb-6">Last updated: January 2025</p>

          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-3">1. Acceptance of Terms</h2>
          <p className="text-gray-700 mb-4">
            By accessing and using Virtual Art, you accept and agree to be bound by these Terms and
            Conditions. If you do not agree, please do not use our services.
          </p>

          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-3">2. User Accounts</h2>
          <p className="text-gray-700 mb-4">
            You are responsible for maintaining the confidentiality of your account credentials and
            for all activities that occur under your account. You must notify us immediately of any
            unauthorized use.
          </p>

          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-3">3. Artist Responsibilities</h2>
          <p className="text-gray-700 mb-4">
            Artists warrant that they own all rights to the artwork they upload and that the artwork
            does not infringe on any third-party rights. Artists are responsible for accurate
            descriptions, pricing, and fulfillment of orders.
          </p>

          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-3">4. Buyer Responsibilities</h2>
          <p className="text-gray-700 mb-4">
            Buyers agree to provide accurate payment information and to pay for all purchases made
            through their account. All sales are final unless otherwise stated by the artist.
          </p>

          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-3">5. Prohibited Activities</h2>
          <p className="text-gray-700 mb-4">
            Users may not engage in fraudulent activities, upload offensive content, or attempt to
            circumvent our platform for direct transactions. Violations may result in account
            termination.
          </p>

          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-3">6. Limitation of Liability</h2>
          <p className="text-gray-700">
            Virtual Art is not liable for disputes between buyers and sellers, quality issues with
            artwork, or shipping problems. We provide the platform but do not guarantee outcomes.
          </p>
        </div>
      </div>
    </div>
  </div>
);

export const PrivacyPage = () => (
  <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-rose-50 py-12">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-amber-600" />
          <h1 className="text-4xl font-bold text-gray-800">Privacy Policy</h1>
        </div>

        <div className="prose max-w-none">
          <p className="text-sm text-gray-600 mb-6">Last updated: January 2025</p>

          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-3">1. Information We Collect</h2>
          <p className="text-gray-700 mb-4">
            We collect information you provide directly, such as your name, email, payment details,
            and artwork information. We also collect usage data, including IP address, browser type,
            and pages visited.
          </p>

          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-3">2. How We Use Your Information</h2>
          <p className="text-gray-700 mb-4">
            We use your information to provide our services, process transactions, communicate with
            you, improve our platform, and comply with legal obligations.
          </p>

          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-3">3. Information Sharing</h2>
          <p className="text-gray-700 mb-4">
            We do not sell your personal information. We may share information with service providers
            who assist in operating our platform, payment processors, and when required by law.
          </p>

          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-3">4. Data Security</h2>
          <p className="text-gray-700 mb-4">
            We implement industry-standard security measures to protect your information. However, no
            method of transmission over the internet is 100% secure, and we cannot guarantee absolute
            security.
          </p>

          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-3">5. Your Rights</h2>
          <p className="text-gray-700 mb-4">
            You have the right to access, correct, or delete your personal information. You may also
            opt out of marketing communications at any time. Contact us to exercise these rights.
          </p>

          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-3">6. Cookies</h2>
          <p className="text-gray-700 mb-4">
            We use cookies to enhance your experience, analyze usage, and remember your preferences.
            You can control cookies through your browser settings.
          </p>

          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-3">7. Contact Us</h2>
          <p className="text-gray-700">
            If you have questions about this Privacy Policy, please contact us at
            privacy@virtualart.com.
          </p>
        </div>
      </div>
    </div>
  </div>
);
