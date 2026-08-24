declare module 'amadeus' {
  interface AmadeusConstructorOptions {
    clientId: string
    clientSecret: string
    hostname?: 'test' | 'production'
  }
  class Amadeus {
    constructor(options: AmadeusConstructorOptions)
    referenceData: {
      locations: {
        hotels: {
          byCity: {
            get(params: Record<string, unknown>): Promise<{ data: unknown[] }>
          }
        }
      }
    }
    shopping: {
      hotelOffersSearch: {
        get(params: Record<string, unknown>): Promise<{ data: unknown[] }>
      }
    }
  }
  export = Amadeus
}
