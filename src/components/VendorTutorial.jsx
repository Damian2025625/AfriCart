"use client";

import { useState, useEffect, useRef } from "react";
import {
  FiArrowRight,
  FiArrowLeft,
  FiCheckCircle,
} from "react-icons/fi";
import { usePathname, useRouter } from "next/navigation";

const TUTORIAL_KEY = "vendorTutorialDone_v11";

const steps = [
  {
    target: null,
    title: "Welcome, Partner! 🎉",
    description: "Welcome to AfriCart! Let's take a 60-second tour of your new command center so you can start selling immediately.",
    position: "center",
  },
  {
    target: "#nav-overview",
    title: "Dashboard Home",
    description: "This is your bird's-eye view of the business. Let's see what's inside this page.",
    position: "right",
    page: "/dashboard/vendor"
  },
  {
    target: "#overview-stats",
    title: "Business Vitals",
    description: "Track your total sales, revenue, and customer growth in real-time. These cards show your performance trends at a glance.",
    position: "bottom",
    page: "/dashboard/vendor"
  },
  {
    target: "#action-add-product",
    title: "Quick Listing",
    description: "Got something new to sell? Use this shortcut to list a product in seconds without leaving your dashboard.",
    position: "bottom",
    page: "/dashboard/vendor"
  },
  {
    target: "#overview-orders",
    title: "Recent Alerts",
    description: "Keep an eye on this section for your latest 5 orders. It's the fastest way to see what needs shipping right now.",
    position: "top",
    page: "/dashboard/vendor"
  },
  {
    target: "#nav-products",
    title: "Inventory Vault",
    description: "This is where you manage your entire catalog. Let's go there now.",
    position: "right",
    page: "/dashboard/vendor/products"
  },
  {
    target: "#products-stats",
    title: "Inventory Health",
    description: "See at a glance how many products are active, low on stock, or completely sold out.",
    position: "bottom",
    page: "/dashboard/vendor/products"
  },
  {
    target: "#products-filters",
    title: "Search & Sort",
    description: "Find any product by name or filter by price and rating. Essential when your catalog starts growing!",
    position: "bottom",
    page: "/dashboard/vendor/products"
  },
  {
    target: "#products-list",
    title: "Product List",
    description: "Edit price, quantity, or visibility for your items. You can also 'Quick Edit' on desktop for fast updates.",
    position: "top",
    page: "/dashboard/vendor/products"
  },
  {
    target: "#nav-orders",
    title: "Order Command",
    description: "Processing orders is the core of your work. Let's see how it looks.",
    position: "right",
    page: "/dashboard/vendor/orders"
  },
  {
    target: "#orders-stats",
    title: "Action Board",
    description: "These cards highlight what needs attention: Pending, In Progress, and Delivered orders.",
    position: "bottom",
    page: "/dashboard/vendor/orders"
  },
  {
    target: "#orders-filters",
    title: "Order Stages",
    description: "Filter orders by status: Confirmed, Processing, Shipped, or Cancelled. Never lose track of a shipment!",
    position: "bottom",
    page: "/dashboard/vendor/orders"
  },
  {
    target: "#orders-list",
    title: "The Dispatch Center",
    description: "This is the master list of every order. You can see customer details, total amounts, and quick action buttons to update order status.",
    position: "top",
    page: "/dashboard/vendor/orders"
  },
  {
    target: "#orders-list",
    title: "Detailed Operations",
    description: "Click the 'View' button or the Order ID on any row to open the Details Page. There you can track full shipping history and customer notes.",
    position: "top",
    page: "/dashboard/vendor/orders"
  },
  {
    target: "#nav-promotions",
    title: "Marketing Hub",
    description: "Want to sell faster? Our viral marketing tools help you reach more customers. Let's look inside.",
    position: "right",
    page: "/dashboard/vendor/promotions"
  },
  {
    target: "#promotions-stats",
    title: "Campaign Vitals",
    description: "Track how many people are seeing your promos and how many are joining your group-buy slashed deals.",
    position: "bottom",
    page: "/dashboard/vendor/promotions"
  },
  {
    target: "#promotions-grid",
    title: "Slashing & Power Hours",
    description: "Launch a 'Community Slashing' to encourage viral sharing, or a 'Power Hour' to auto-accept negotiations within your range.",
    position: "top",
    page: "/dashboard/vendor/promotions"
  },
  {
    target: "#promotions-monitoring",
    title: "Real-time Monitoring",
    description: "Watch your active campaigns as they happen. See exactly how many more people need to join to trigger a price slash!",
    position: "top",
    page: "/dashboard/vendor/promotions"
  },
  {
    target: "#nav-analytics",
    title: "Intelligence Hub",
    description: "This is where you find your growth trends and settlement data. Let's check it out.",
    position: "right",
    page: "/dashboard/vendor/analytics"
  },
  {
    target: "#analytics-time-range",
    title: "Date Matrix",
    description: "Switch between Daily, Weekly, or Monthly views to see how your business evolves over time.",
    position: "bottom",
    page: "/dashboard/vendor/analytics"
  },
  {
    target: "#analytics-stats",
    title: "Financial Snapshot",
    description: "Track your actual Revenue, Ledger Balance, and the exact date of your next payout.",
    position: "bottom",
    page: "/dashboard/vendor/analytics"
  },
  {
    target: "#analytics-revenue",
    title: "Sales Velocity",
    description: "Monitor your revenue trends with this live graph. It helps you identify your peak selling days.",
    position: "bottom",
    page: "/dashboard/vendor/analytics"
  },
  {
    target: "#analytics-share",
    title: "Market Share",
    description: "See which categories are your top performers. Focus your inventory on what's actually moving!",
    position: "left",
    page: "/dashboard/vendor/analytics"
  },
  {
    target: "#analytics-settlements",
    title: "Payout Ledger",
    description: "This audit trail shows every Kobo that has been paid to your bank account. Transparency for your peace of mind.",
    position: "top",
    page: "/dashboard/vendor/analytics"
  },
  {
    target: "#nav-chats",
    title: "Direct Conversations",
    description: "Built-in chat lets you talk directly with your customers. Clear communication leads to better ratings and fewer returns!",
    position: "right",
    page: "/dashboard/vendor/chats"
  },
  {
    target: "#nav-offers",
    title: "Special Offers",
    description: "Manage price negotiations and custom deals here. A quick response to an offer often seals the sale!",
    position: "right",
    page: "/dashboard/vendor/offers"
  },
  {
    target: "#offers-stats",
    title: "Offer Overview",
    description: "Track your negotiation pipeline. Keep an eye on 'Pending' offers to ensure you don't miss out on sales!",
    position: "bottom",
    page: "/dashboard/vendor/offers"
  },
  {
    target: "#offers-tabs",
    title: "Filtering Negotiations",
    description: "Easily switch between pending, countered, and closed deals to keep your responses organized.",
    position: "bottom",
    page: "/dashboard/vendor/offers"
  },
  {
    target: "#offer-actions",
    title: "Responding to Deals",
    description: "When a customer makes an offer, you can Accept, Counter, or Decline. Once accepted, you can chat with them to finalize the transaction.",
    position: "top",
    page: "/dashboard/vendor/offers"
  },
  {
    target: "#nav-profile",
    title: "Your Identity",
    description: "Finally, keep your shop info (logo, name, bank account) up to date here.",
    position: "right",
    page: "/dashboard/vendor/profile"
  },
  {
    target: null,
    title: "Ready to Launch? 🚀",
    description: "You're all set! Start listing products and watch your business grow. We're excited to have you on board!",
    position: "center",
  }
];

export default function VendorTutorial() {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightStyles, setSpotlightStyles] = useState({});
  const [popoverStyles, setPopoverStyles] = useState({});
  const popoverRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // If we're on a logout page or not logged in, don't show
    if (pathname === "/login" || pathname === "/register") return;

    const done = localStorage.getItem(TUTORIAL_KEY);
    if (!done) {
      const timer = setTimeout(() => {
        setVisible(true);
      }, 1000); 
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  useEffect(() => {
    if (visible) {
      const step = steps[currentStep];
      if (step && step.page && step.page !== pathname) {
        setSpotlightStyles({ opacity: 0, pointerEvents: "none" });
        return;
      }

      updateSpotlight();
      window.addEventListener("resize", updateSpotlight);
      window.addEventListener("scroll", updateSpotlight);
      return () => {
        window.removeEventListener("resize", updateSpotlight);
        window.removeEventListener("scroll", updateSpotlight);
      };
    }
  }, [visible, currentStep, pathname]);

  const updateSpotlight = () => {
    const step = steps[currentStep];
    if (!step.target) {
      setSpotlightStyles({ opacity: 0, pointerEvents: "none" });
      setPopoverStyles({
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        position: "fixed",
        opacity: 1,
        visibility: "visible",
      });
      return;
    }

    const element = document.querySelector(step.target);
    if (element) {
      if (typeof element.scrollIntoView === 'function') {
        const isElementHuge = element.offsetHeight > window.innerHeight * 0.7;
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: isElementHuge ? 'start' : 'center' 
        });
      }

      const rect = element.getBoundingClientRect();
      const padding = 8;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      // Use actual popover height if available, otherwise use a safe large estimate
      const cardWidth = 350; 
      const estimatedCardHeight = popoverRef.current?.offsetHeight || 450; 
      const margin = 15;

      setSpotlightStyles({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: Math.min(rect.height + padding * 2, screenHeight * 0.8),
        opacity: 1,
        borderRadius: "12px",
        boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.75)",
        pointerEvents: "none",
      });

      let top = 0;
      let left = 0;
      let transform = "";

      if (step.position === "right") {
        top = rect.top + (rect.height / 2);
        left = rect.right + 25;
        transform = "translateY(-50%)";
        
        if (left + cardWidth > screenWidth) {
          left = rect.left - cardWidth - 25;
          if (left < margin) { 
            left = screenWidth / 2;
            transform = "translate(-50%, -50%)";
            top = screenHeight / 2;
          }
        }
      } else if (step.position === "left") {
        top = rect.top + (rect.height / 2);
        left = rect.left - 25;
        transform = "translate(-100%, -50%)";
        
        if (left - cardWidth < margin) {
          left = rect.right + 25;
          transform = "translateY(-50%)";
          if (left + cardWidth > screenWidth) {
            left = screenWidth / 2;
            transform = "translate(-50%, -50%)";
            top = screenHeight / 2;
          }
        }
      } else if (step.position === "bottom") {
        top = rect.bottom + 25;
        left = rect.left + (rect.width / 2);
        transform = "translateX(-50%)";
        
        // If too far down, flip to top
        if (top + estimatedCardHeight > screenHeight - margin) {
          top = rect.top - 25;
          transform = "translate(-50%, -100%)";
        }
      } else if (step.position === "top") {
        top = rect.top - 25;
        left = rect.left + (rect.width / 2);
        transform = "translate(-50%, -100%)";
        
        // If too far up, flip to bottom
        if (top - estimatedCardHeight < margin) {
          top = rect.bottom + 25;
          transform = "translateX(-50%)";
        }
      }

      const halfWidth = cardWidth / 2;
      left = Math.max(margin + halfWidth, Math.min(screenWidth - margin - halfWidth, left));
      
      const isBottomPinned = transform.includes("-100%"); 
      const isCenterVertical = transform.includes("-50%") && (transform.includes("Y") || transform.includes(","));
      
      if (isBottomPinned) {
        // Bottom of card is at 'top' (e.g. position="top")
        top = Math.max(estimatedCardHeight + margin, Math.min(screenHeight - margin, top));
      } else if (isCenterVertical) {
        // Center of card is at 'top' (e.g. position="right" or "left")
        top = Math.max(estimatedCardHeight/2 + margin, Math.min(screenHeight - estimatedCardHeight/2 - margin, top));
      } else {
        // Top of card is at 'top' (e.g. position="bottom")
        top = Math.max(margin, Math.min(screenHeight - estimatedCardHeight - margin, top));
      }

      setPopoverStyles({
        top,
        left,
        transform,
        position: "fixed",
        opacity: 1,
        visibility: "visible",
        maxWidth: 'calc(100vw - 40px)',
        maxHeight: 'calc(100vh - 40px)',
      });
    }
  };

  const next = () => {
    const nextStepIndex = currentStep + 1;
    if (nextStepIndex < steps.length) {
      const nextStep = steps[nextStepIndex];
      if (nextStep.page && nextStep.page !== pathname) {
        router.push(nextStep.page);
      }
      setCurrentStep(nextStepIndex);
    } else {
      finish();
    }
  };

  const prev = () => {
    const prevStepIndex = currentStep - 1;
    if (prevStepIndex >= 0) {
      const prevStep = steps[prevStepIndex];
      if (prevStep.page && prevStep.page !== pathname) {
        router.push(prevStep.page);
      }
      setCurrentStep(prevStepIndex);
    }
  };

  const finish = () => {
    setVisible(false);
    localStorage.setItem(TUTORIAL_KEY, "true");
  };

  if (!visible) return null;

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <div 
        className="fixed z-0 transition-all duration-500 ease-in-out"
        style={spotlightStyles}
      />

      <div
        ref={popoverRef}
        style={popoverStyles}
        className="absolute z-10 w-[350px] bg-white rounded-3xl shadow-2xl pointer-events-auto transition-all duration-500 border border-orange-100 flex flex-col overflow-hidden"
      >
        <div className="h-1 bg-gradient-to-r from-orange-500 to-green-600 shrink-0" />
        
        <div className="p-6 overflow-y-auto max-h-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
              Vendor Tour · Point {currentStep + 1}
            </span>
            <button 
              onClick={finish} 
              className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-tighter"
            >
              Skip Tour
            </button>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed min-h-[50px] mb-6">{step.description}</p>

          <div className="flex items-center justify-between mt-auto gap-3">
            <div className="min-w-[50px]">
              {!isFirst && (
                <button
                  onClick={prev}
                  className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiArrowLeft /> Back
                </button>
              )}
            </div>

            <div className="flex gap-1 overflow-hidden px-1">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-0.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-3 bg-orange-500' : 'w-1 bg-gray-200'}`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-green-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all outline-none whitespace-nowrap"
            >
              {isLast ? (
                <>Finish <FiCheckCircle /></>
              ) : (
                <>Next <FiArrowRight /></>
              )}
            </button>
          </div>
        </div>

        {step.target && (
          <div 
            className={`absolute w-0 h-0 border-transparent transition-all duration-500
              ${step.position === 'right' ? 'left-[-10px] top-1/2 -translate-y-1/2 border-t-[10px] border-b-[10px] border-r-[10px] border-r-white drop-shadow-[-4px_0_4px_rgba(0,0,0,0.05)]' : ''}
              ${step.position === 'left' ? 'right-[-10px] top-1/2 -translate-y-1/2 border-t-[10px] border-b-[10px] border-l-[10px] border-l-white drop-shadow-[4px_0_4px_rgba(0,0,0,0.05)]' : ''}
              ${step.position === 'bottom' ? 'top-[-10px] left-1/2 -translate-x-1/2 border-l-[10px] border-r-[10px] border-b-[10px] border-b-white' : ''}
              ${step.position === 'top' ? 'bottom-[-10px] left-1/2 -translate-x-1/2 border-l-[10px] border-r-[10px] border-t-[10px] border-t-white' : ''}
            `}
          />
        )}
      </div>
    </div>
  );
}
