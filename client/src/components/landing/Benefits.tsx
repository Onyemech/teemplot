import { Check } from 'lucide-react'

const benefits = [
  {
    title: 'Get started quickly',
    description: 'Breeze through our seamless onboarding process and get your company started in minutes not days',
  },
  {
    title: 'For companies of all size',
    description: "Whether you're a startup, SME or a Large corporation - Our solutions got you covered",
  },
  {
    title: 'Stay in the loop',
    description: "Keep updated on your staff's and company's procedure to make running your company a whole lot easier",
  },
]

export default function Benefits() {
  return (
    <section id="benefits" className="py-24 px-6 bg-gradient-primary text-primary-foreground relative overflow-hidden">
      <div className="absolute bottom-0 right-0 w-64 h-64 opacity-20">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <path d="M100,50 L120,80 L150,90 L130,110 L135,140 L100,125 L65,140 L70,110 L50,90 L80,80 Z" fill="currentColor" />
          <path d="M100,30 L125,65 L165,75 L140,100 L145,135 L100,115 L55,135 L60,100 L35,75 L75,65 Z" fill="currentColor" />
          <path d="M100,20 L130,60 L175,70 L145,95 L150,140 L100,110 L50,140 L55,95 L25,70 L70,60 Z" fill="currentColor" />
        </svg>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="space-y-12">
          {benefits.map((benefit, index) => (
            <div 
              key={index}
              className="flex gap-6 items-start animate-fade-in"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                  <Check className="h-5 w-5 text-accent-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold">
                  {benefit.title}
                </h3>
                <p className="text-primary-foreground/80 text-lg leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
