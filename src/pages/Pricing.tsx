import React, { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      name: "Hobby",
      price: "0",
      description: "For personal projects, hobby sites, and experiments.",
      features: [
        "1 Developer",
        "100GB Bandwidth",
        "Custom Domains",
        "Automatic SSL",
        "Community Support",
        "Serverless Functions (100k/mo)"
      ],
      cta: "Start Deploying",
      link: "/register"
    },
    {
      name: "Pro",
      price: isAnnual ? "20" : "24",
      description: "For professional teams and production applications.",
      features: [
        "Up to 10 Team Members",
        "1TB Bandwidth",
        "Preview Deployments",
        "Password Protection",
        "Email Support",
        "Advanced Analytics",
        "Serverless Functions (1M/mo)"
      ],
      cta: "Start Free Trial",
      link: "/register",
      highlight: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large organizations with custom infrastructure needs.",
      features: [
        "Unlimited Team Members",
        "Custom Bandwidth",
        "SSO / SAML",
        "Dedicated Success Manager",
        "SLA 99.99%",
        "24/7 Phone Support",
        "Dedicated IP Addresses"
      ],
      cta: "Contact Sales",
      link: "/contact"
    }
  ];

  return (
    <div className="min-h-screen bg-background text-text-primary pt-20 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-primary)_0%,_transparent_50%)] opacity-[0.05] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 relative z-10">
        
        <div className="text-center space-y-6 max-w-2xl mx-auto mt-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">
              Pricing that scales
            </h1>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl text-text-secondary"
          >
            Start for free, upgrade when you need to. No hidden fees.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center justify-center gap-4 pt-8"
          >
            <span className={`text-sm ${!isAnnual ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>Monthly</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="w-14 h-7 rounded-full bg-surface border border-border relative flex items-center px-1 transition-colors hover:border-zinc-500"
            >
              <div className={`w-5 h-5 rounded-full bg-text-primary transition-transform duration-300 ${isAnnual ? 'translate-x-7' : 'translate-x-0'}`} />
            </button>
            <span className={`text-sm ${isAnnual ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>Annually <span className="text-success text-xs bg-success/10 px-2 py-0.5 rounded-full ml-1">Save 20%</span></span>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-24 mt-12">
          {plans.map((plan, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + (idx * 0.1) }}
              className={`rounded-3xl border ${
                plan.highlight 
                  ? 'border-primary shadow-[0_0_40px_rgba(109,40,217,0.15)] bg-card/80 backdrop-blur-xl relative' 
                  : 'border-border bg-surface/50'
              } p-8 flex flex-col group hover:border-zinc-500 transition-colors`}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-text-primary text-xs font-bold uppercase tracking-widest py-1 px-4 rounded-full">
                  Most Popular
                </div>
              )}
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-text-secondary text-sm mb-6 h-10">{plan.description}</p>
              
              <div className="mb-8 flex items-end gap-1">
                <span className="text-5xl font-bold tracking-tight">
                  {plan.price !== 'Custom' ? '$' : ''}{plan.price}
                </span>
                {plan.price !== 'Custom' && <span className="text-text-secondary mb-2">/mo</span>}
              </div>
              
              <Link
                to={plan.link}
                className={`w-full py-4 rounded-xl text-sm font-semibold text-center transition-all mb-8 flex items-center justify-center gap-2 ${
                  plan.highlight 
                    ? 'bg-white text-black hover:bg-zinc-200' 
                    : 'bg-card text-text-primary hover:bg-zinc-800 border border-border'
                }`}
              >
                {plan.cta} <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="space-y-4 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">What's included</p>
                {plan.features.map((feature, fIdx) => (
                  <div key={fIdx} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm text-zinc-300">{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
}
