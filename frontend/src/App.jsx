import { useEffect, useState } from 'react'

function App() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8 sm:py-12 md:py-16 lg:py-20">
        <div className={`max-w-4xl mx-auto ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`}>
          <header className={`mb-8 sm:mb-12 md:mb-16 ${isLoaded ? 'animate-slide-up stagger-1' : 'opacity-0'}`}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold text-neutral-900 mb-4 leading-tight">
              Welcome to Your
              <span className="block text-accent">Modern App</span>
            </h1>
            <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl">
              Built with React, Tailwind CSS, Express, and PostgreSQL. 
              Mobile-first design with distinctive aesthetics.
            </p>
          </header>

          <section className={`grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3 mb-12 ${isLoaded ? 'animate-slide-up stagger-2' : 'opacity-0'}`}>
            <Card 
              title="React"
              description="Modern UI components with hooks"
              delay="stagger-1"
            />
            <Card 
              title="Tailwind CSS"
              description="Utility-first styling"
              delay="stagger-2"
            />
            <Card 
              title="Express"
              description="Robust backend API"
              delay="stagger-3"
            />
          </section>

          <section className={`${isLoaded ? 'animate-slide-up stagger-3' : 'opacity-0'}`}>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 md:p-10 shadow-lg border border-neutral-200/50">
              <h2 className="text-2xl sm:text-3xl font-display font-semibold mb-4 text-neutral-900">
                Get Started
              </h2>
              <p className="text-neutral-600 mb-6">
                This project follows mobile-first principles with a distinctive design aesthetic.
                The backend is ready to connect to PostgreSQL.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-light transition-colors">
                  Explore Features
                </button>
                <button className="px-6 py-3 bg-white border-2 border-neutral-300 text-neutral-900 rounded-lg font-medium hover:border-accent transition-colors">
                  View Documentation
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function Card({ title, description, delay }) {
  return (
    <div className={`bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-neutral-200/50 hover:shadow-lg transition-shadow ${delay}`}>
      <h3 className="text-xl font-display font-semibold mb-2 text-neutral-900">
        {title}
      </h3>
      <p className="text-neutral-600 text-sm sm:text-base">
        {description}
      </p>
    </div>
  )
}

export default App
