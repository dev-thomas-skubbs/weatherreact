import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Custom hook for localStorage persistence - simplified without generics
function usePersistedState(key: string, defaultValue: any): [any, (value: any) => void] {
  const [state, setState] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // Handle localStorage errors silently
    }
  }, [key, state])

  return [state, setState]
}

interface WeatherData {
  id: number
  name: string
  main: {
    temp: number
    feels_like: number
    temp_min: number
    temp_max: number
    pressure: number
    humidity: number
  }
  weather: Array<{
    id: number
    main: string
    description: string
    icon: string
  }>
  wind: {
    speed: number
    deg?: number
  }
  visibility: number
  sys: {
    country: string
    sunrise: number
    sunset: number
  }
  dt: number
}

interface FavoriteCity {
  id: number
  name: string
  country: string
}

interface SearchSectionProps {
  city: string
  setCity: (city: string) => void
  onSearch: (e: React.FormEvent) => void
  onLocationSearch: () => void
  loading: boolean
}

interface WeatherCardProps {
  weather: WeatherData
  onAddToFavorites: () => void
  isFavorite: boolean
}

interface FavoritesSectionProps {
  favorites: FavoriteCity[]
  onLoadFavorite: (cityName: string) => void
  onRemoveFavorite: (cityId: number) => void
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WeatherApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function WeatherApp() {
  const [weather, setWeather] = usePersistedState('weather', null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [city, setCity] = useState('')
  const [favorites, setFavorites] = usePersistedState('favorite-cities', [])

  const API_KEY = '0aeddd193be3c95b645124306bc7fceb'

  const fetchWeather = async (cityName: string) => {
    setLoading(true)
    setError('')
    
    try {
      // Encode the city name to handle international characters and spaces
      const encodedCityName = encodeURIComponent(cityName.trim())
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodedCityName}&appid=${API_KEY}&units=metric`
      )
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`City "${cityName}" not found. Please check the spelling and try again.`)
        } else if (response.status === 401) {
          throw new Error('Invalid API key. Please check your OpenWeather API configuration.')
        } else if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.')
        } else {
          throw new Error(`Failed to fetch weather data (${response.status}). Please try again.`)
        }
      }
      
      const data: WeatherData = await response.json()
      setWeather(data)
      setError('') // Clear any previous errors
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
      setWeather(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchWeatherByLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    setLoading(true)
    setError('')

    navigator.geolocation.getCurrentPosition(
  async (position) => {
    try {
      const { latitude, longitude } = position.coords
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch weather data for your location')
      }
      
      const data: WeatherData = await response.json()
      setWeather(data)
      setError('')
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to get weather for your location')
      }
    } finally {
      setLoading(false)
    }
  },
  (error) => {
    let errorMessage = 'Unable to retrieve your location. '
    switch (error.code) {
      case 1: // PERMISSION_DENIED
        errorMessage += 'Location access was denied.'
        break
      case 2: // POSITION_UNAVAILABLE
        errorMessage += 'Location information is unavailable.'
        break
      case 3: // TIMEOUT
        errorMessage += 'Location request timed out.'
        break
      default:
        errorMessage += 'Please try searching for a city instead.'
        break
    }
    setError(errorMessage)
    setLoading(false)
  },
  {
    timeout: 10000,
    enableHighAccuracy: false
  }
)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedCity = city.trim()
    if (trimmedCity) {
      fetchWeather(trimmedCity)
      setCity('')
    }
  }

  const addToFavorites = () => {
    if (weather && !favorites.some((fav: FavoriteCity) => fav.id === weather.id)) {
      setFavorites([...favorites, {
        id: weather.id,
        name: weather.name,
        country: weather.sys.country
      }])
    }
  }

  const removeFromFavorites = (cityId: number) => {
    setFavorites(favorites.filter((fav: FavoriteCity) => fav.id !== cityId))
  }

  const loadFavorite = (cityName: string) => {
    fetchWeather(cityName)
  }

  useEffect(() => {
    // Load weather for current location on first visit
    if (!weather) {
      fetchWeatherByLocation()
    }
  }, [weather])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              🌤️ Weather App
            </h1>
            <p className="text-blue-100 text-lg">
              Get current weather conditions for any city worldwide
            </p>
          </div>

          {/* Search Section */}
          <SearchSection
            city={city}
            setCity={setCity}
            onSearch={handleSearch}
            onLocationSearch={fetchWeatherByLocation}
            loading={loading}
          />

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-500 bg-opacity-90 text-white rounded-lg shadow-lg">
              <div className="flex items-center">
                <span className="mr-2">⚠️</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Weather Display */}
          {loading ? (
            <LoadingSpinner />
          ) : weather ? (
            <WeatherCard 
              weather={weather}
              onAddToFavorites={addToFavorites}
              isFavorite={favorites.some((fav: FavoriteCity) => fav.id === weather.id)}
            />
          ) : (
            <div className="text-center text-white text-lg bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8">
              <div className="text-4xl mb-4">🔍</div>
              <div>Search for a city to see the weather forecast</div>
              <div className="text-sm text-blue-100 mt-2">
                Try: "New York", "Tokyo", "Singapore", "London", etc.
              </div>
            </div>
          )}

          {/* Favorites Section */}
          {favorites.length > 0 && (
            <FavoritesSection
              favorites={favorites}
              onLoadFavorite={loadFavorite}
              onRemoveFavorite={removeFromFavorites}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function SearchSection({ city, setCity, onSearch, onLocationSearch, loading }: SearchSectionProps) {
  return (
    <div className="mb-8">
      <form onSubmit={onSearch} className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter city name (e.g., New York, Tokyo, Singapore)..."
            className="w-full px-4 py-3 rounded-lg border-0 shadow-lg focus:ring-4 focus:ring-blue-200 focus:outline-none text-gray-700 placeholder-gray-400"
            disabled={loading}
          />
          <span className="absolute right-3 top-3 text-gray-400">🔍</span>
        </div>
        <button
          type="submit"
          disabled={loading || !city.trim()}
          className="px-6 py-3 bg-white text-blue-600 rounded-lg shadow-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>
      
      <div className="text-center">
        <button
          onClick={onLocationSearch}
          disabled={loading}
          className="px-6 py-2 bg-blue-500 bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm transition-colors"
        >
          📍 Use Current Location
        </button>
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-12">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-4"></div>
        <p className="text-white text-sm">Loading weather data...</p>
      </div>
    </div>
  )
}

function WeatherCard({ weather, onAddToFavorites, isFavorite }: WeatherCardProps) {
  const getWeatherIcon = (code: string) => {
    const iconMap: { [key: string]: string } = {
      '01d': '☀️', '01n': '🌙',
      '02d': '⛅', '02n': '☁️',
      '03d': '☁️', '03n': '☁️',
      '04d': '☁️', '04n': '☁️',
      '09d': '🌧️', '09n': '🌧️',
      '10d': '🌦️', '10n': '🌧️',
      '11d': '⛈️', '11n': '⛈️',
      '13d': '❄️', '13n': '❄️',
      '50d': '🌫️', '50n': '🌫️'
    }
    return iconMap[weather.weather[0].icon] || '🌤️'
  }

  return (
    <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl text-white mb-8">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold">
            {weather.name}, {weather.sys.country}
          </h2>
          <p className="text-blue-100 capitalize">
            {weather.weather[0].description}
          </p>
          <p className="text-xs text-blue-200 mt-1">
            Updated: {new Date(weather.dt * 1000).toLocaleString()}
          </p>
        </div>
        <button
          onClick={onAddToFavorites}
          disabled={isFavorite}
          className={`p-2 rounded-full transition-colors text-2xl ${
            isFavorite 
              ? 'text-yellow-300 cursor-default' 
              : 'text-white hover:text-yellow-300 hover:bg-white hover:bg-opacity-10'
          }`}
          title={isFavorite ? 'Already in favorites' : 'Add to favorites'}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Temperature */}
        <div className="text-center">
          <div className="text-6xl mb-2">{getWeatherIcon(weather.weather[0].icon)}</div>
          <div className="text-4xl font-bold mb-1">
            {Math.round(weather.main.temp)}°C
          </div>
          <div className="text-sm text-blue-100">
            Feels like {Math.round(weather.main.feels_like)}°C
          </div>
        </div>

        {/* Weather Details */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-blue-100">High:</span>
            <span className="font-semibold">{Math.round(weather.main.temp_max)}°C</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-100">Low:</span>
            <span className="font-semibold">{Math.round(weather.main.temp_min)}°C</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-100">Humidity:</span>
            <span className="font-semibold">{weather.main.humidity}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-100">Pressure:</span>
            <span className="font-semibold">{weather.main.pressure} hPa</span>
          </div>
        </div>

        {/* Additional Info */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-blue-100">Wind:</span>
            <span className="font-semibold">{weather.wind.speed} m/s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-100">Visibility:</span>
            <span className="font-semibold">{(weather.visibility / 1000).toFixed(1)} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-100">Sunrise:</span>
            <span className="font-semibold">
              {new Date(weather.sys.sunrise * 1000).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-100">Sunset:</span>
            <span className="font-semibold">
              {new Date(weather.sys.sunset * 1000).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function FavoritesSection({ favorites, onLoadFavorite, onRemoveFavorite }: FavoritesSectionProps) {
  return (
    <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl">
      <h3 className="text-xl font-bold text-white mb-4">📍 Favorite Cities</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {favorites.map((city: FavoriteCity) => (
          <div
            key={city.id}
            className="bg-white bg-opacity-10 rounded-lg p-4 hover:bg-opacity-20 transition-colors group"
          >
            <div className="flex justify-between items-center">
              <button
                onClick={() => onLoadFavorite(city.name)}
                className="flex-1 text-left text-white hover:text-blue-200 transition-colors"
              >
                <div className="font-semibold">{city.name}</div>
                <div className="text-sm text-blue-200">{city.country}</div>
              </button>
              <button
                onClick={() => onRemoveFavorite(city.id)}
                className="text-red-300 hover:text-red-200 opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-xl"
                title="Remove from favorites"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}