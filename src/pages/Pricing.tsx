import React from 'react';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Pricing() {
  const plans = [
    {
      name: "Hobby",
      price: "0",
      description: "For personal projects and experiments.",
      features: [
        "1 Developer",
        "100GB Bandwidth",
        "Custom Domains",
        "Automatic SSL",
        "Community Support"
      ],
      cta: "Start Deploying",
      link: "/register"
    },
    {
      name: "Pro",
      price: "20",
      description: "For teams and production applications.",
      features: [
        "Up to 10 Team Members",
        "1TB Bandwidth",
        "Preview Deployments",
        "Password Protection",
        "Email Support",
        "Advanced Analytics"
      ],
      cta: "Start Free Trial",
      link: "/register",
      highlight: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large scale organizations.",
      features: [
        "Unlimited Team Members",
        "Custom Bandwidth",
        "SSO / SAML",
        "Dedicated Success Manager",
        "SLA 99.99%",
        "24/7 Phone Support"
      ],
      cta: "Contact Sales",
      link: "/contact"
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="text-5xl font-bold tracking-tight">
            Pricing that scales with you
          </h1>
          <p className="text-xl text-zinc-400">
            Start for free, upgrade when you need to. No hidden fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-24">
          {plans.map((plan, idx) => (
            <div 
              key={idx} 
              className={`rounded-2xl border ${
                plan.highlight ? 'border-white bg-zinc-900/50' : 'border-zinc-800 bg-zinc-950'
              } p-8 flex flex-col`}
            >
              <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
              <p className="text-zinc-400 text-sm mb-6 h-10">{plan.description}</p>
              <div className="mb-8">
                <span className="text-4xl font-bold">
                  {plan.price !== 'Custom' ? '$' : ''}{plan.price}
                </span>
                {plan.price !== 'Custom' && <span className="text-zinc-500">/mo</span>}
              </div>
              
              <Link
                to={plan.link}
                className={`w-full py-3 rounded-md text-sm font-medium text-center transition-colors mb-8 ${
                  plan.highlight 
                    ? 'bg-white text-black hover:bg-zinc-200' 
                    : 'bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                {plan.cta}
              </Link>

              <div className="space-y-4 flex-1">
                {plan.features.map((feature, fIdx) => (
                  <div key={fIdx} className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-white" />
                    <span className="text-sm text-zinc-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
