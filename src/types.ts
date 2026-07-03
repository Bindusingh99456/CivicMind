export interface Domain {
  icon: string;
  id: string;
  name: string;
  desc: string;
  stat: string;
  pct: number;
  color: string;
}

export interface Insight {
  icon: string;
  color: string;
  category: string;
  title: string;
  body: string;
  impact: string;
  pct: number;
}

export interface Prediction {
  type: string;
  domain: string;
  text: string;
  confidence: number;
}

export interface Metrics {
  aqi: {
    score: number;
    pm25: number;
    pm10: number;
    no2: number;
    o3: number;
  };
  energy: number[];
  mobility: {
    bus: number[];
    metro: number[];
    traffic: number[];
  };
  health: {
    score: number;
    beds: number;
    wait_time: number;
    ambulance_eta: number;
    clinics: number;
  };
  waste: number[];
  heatmap: {
    zone: number;
    value: number;
    status: string;
  }[];
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
