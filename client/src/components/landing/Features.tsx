import { UserPlus, ListChecks, CalendarDays, Smartphone, FileBarChart, TrendingUp } from 'lucide-react'
import ScrollReveal from '../ui/ScrollReveal'
import WaveRevealCard from '../ui/WaveRevealCard'
import FluidWaveContainer from '../ui/FluidWaveContainer'
import TypeWriter from '../ui/TypeWriter'

const features = [
  {
    icon: UserPlus,
    title: 'Smart Onboarding',
    description: 'Streamlined new hire integration with company-specific setup, location mapping, and automated workflows',
    color: 'accent',
  },
  {
    icon: ListChecks,
    title: 'Task Management',
    description: 'Assign, track, and validate tasks with real-time progress monitoring and automated due date enforcement',
    color: 'primary',
  },
  {
    icon: CalendarDays,
    title: 'Leave Management',
    description: 'Multi-level approval workflows with policy customization for parental, official, sick, and custom leave types',
    color: 'accent',
  },
  {
    icon: Smartphone,
    title: 'Mobile Attendance',
    description: 'GPS-enabled mobile app with geofencing, offline sync, and QR code scanning for seamless check-ins',
    color: 'primary',
  },
  {
    icon: FileBarChart,
    title: 'Reporting & Analytics',
    description: 'Comprehensive attendance and performance reports with audit logs and export functionality for data-driven decisions',
    color: 'accent',
  },
  {
    icon: TrendingUp,
    title: 'Performance Metrics',
    description: 'Visual analytics dashboards tracking punctuality, task completion, and appraisal cycles with actionable insights',
    color: 'primary',
  },
]

export default function Features() {
  return (
    <section id="features" className="py-24 px-6 bg-secondary/30 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 space-y-4">
          <ScrollReveal direction="fade" delay={0.1}>
            <div className="inline-block px-4 py-2 bg-accent/10 rounded-full mb-4">
              <span className="text-accent font-semibold text-sm">FEATURES</span>
            </div>
          </ScrollReveal>
          
          <ScrollReveal direction="up" delay={0.2}>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">
              <TypeWriter 
                text="Everything You Need in "
                speed={40}
                delay={300}
                cursor={false}
              />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                <TypeWriter 
                  text="One Platform"
                  speed={40}
                  delay={1400}
                  cursor={true}
                  cursorChar="|"
                />
              </span>
            </h2>
          </ScrollReveal>
          
          <ScrollReveal direction="up" delay={0.3}>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive HR solutions designed for companies of all sizes, from startups to large enterprises
            </p>
          </ScrollReveal>
        </div>

        <FluidWaveContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            const iconColor = feature.color === 'accent' ? 'text-accent' : 'text-primary'
            const bgGradient = feature.color === 'accent' 
              ? 'from-accent/20 to-accent/5' 
              : 'from-primary/20 to-primary/5'
            
            return (
              <WaveRevealCard 
                key={index}
                index={index}
                className="group hover:shadow-glow transition-all duration-500 border border-border/50 bg-card/80 backdrop-blur-sm hover:border-accent/50 relative overflow-hidden rounded-lg p-8 space-y-4"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-accent/0 via-accent/0 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10 space-y-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${bgGradient} flex items-center justify-center group-hover:scale-125 group-hover:rotate-6 transition-all duration-500 shadow-soft`}>
                    <Icon className={`h-8 w-8 ${iconColor} group-hover:drop-shadow-glow`} />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground group-hover:text-accent transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors duration-300">
                    {feature.description}
                  </p>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-accent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
              </WaveRevealCard>
            )
          })}
        </FluidWaveContainer>
      </div>
    </section>
  )
}
