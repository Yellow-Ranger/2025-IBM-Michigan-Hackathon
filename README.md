# Project Lyoko

> **A natural-language digital twin platform for factory floor optimization**

Redesign your factory layout in minutes instead of weeks—using plain English commands to optimize equipment placement, simulate workflows, and eliminate costly trial-and-error.

---

## 🚨 The Problem

Michigan manufacturers waste millions each year on inefficient floor layouts:

- **Floor changes take weeks:** Adding one CNC machine can require CAD specialists, safety reviews, workflow audits, and expensive downtime ($50k–$200k per rearrangement)
- **Managers can't use CAD tools:** Current digital twin software requires specialized skills most floor managers don't have
- **No fast "what-if" scenarios:** Testing forklift traffic, material flow, or safety spacing requires real-world experimentation and guesswork

---

## ⭐ The Solution

Describe what you want using **natural language**:

```
"Move the press brake next to the welding cell."
"Add a new CNC machine and optimize material flow."
"Remove these pallets and widen the walkway to OSHA standards."
```

The AI **instantly**:
- ✅ Rearranges equipment with realistic dimensions
- ✅ Recalculates safety zones and clearances
- ✅ Highlights violations and suggests optimal layouts
- ✅ Shows cost/time impact
- ✅ Exports as STL, DXF, or installation instructions

**No CAD skills needed. No bottlenecks. No guessing.**

---

## 💡 Key Features

### 1. Floor Layout Digital Twin
Interactive 2D/2.5D factory map with:
- Scalable equipment blocks with accurate dimensions
- Aisles, safety zones, and forklift routes
- Real-time distance calculations (feet/meters)

### 2. Natural Language Commands
```
"Shift everything in zone B to the left by 2 feet"
"Optimize forklift paths"
"Create a new machining cell"
"Add 30% more warehouse storage"
```

### 3. AI Optimization Modes
- **Safety:** Auto-correct OSHA spacing violations
- **Efficiency:** Minimize travel distance
- **Throughput:** Reduce bottlenecks
- **Simulation:** Preview traffic patterns

### 4. Impact Dashboard
Real-time metrics:
- Estimated throughput increase
- Distance/time saved
- Implementation cost
- Space utilization %

### 5. Import/Export
- Import floor plans (photos, CAD files, or LIDAR scans)
- Export as STL, DXF, PDF blueprints, or work orders

### 6. "What-If" Scenarios
Run instant simulations:
- "What if we add a second welding station?"
- "What if we remove these pallets?"
- "What if we expand to the next bay?"

### 7. Real-Time Constraint Checker
Automatically flags:
- Blocked aisles and emergency exits
- OSHA safety violations
- Forklift turning radius issues
- Equipment overlaps
- Power drop conflicts

### 8. IBM Technology Integration
- **Watsonx:** Natural language interpretation
- **Watsonx Granite:** Intent parsing and spatial reasoning
- **IBM Maximo:** (Optional) Live equipment status
- **IBM Geospatial APIs:** Layout memory and optimization

---

## 🏆 Why This Matters

### Impact
- **Saves $50k–$500k per re-layout**
- **Reduces planning time from weeks to minutes**
- **Eliminates trial-and-error mistakes**
- **Improves worker safety and efficiency**

### Market Reach
Transferable across industries:
- Manufacturing (automotive plants—huge in Michigan)
- Warehousing and logistics
- Laboratories and cleanrooms
- Retail stores and events
- Office space planning

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI
- iOS Simulator or Android Emulator (or physical device)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd 2025-IBM-Michigan-Hackathon

# Install dependencies
npm install

# Configure environment
# Set EXPO_PUBLIC_WEB_APP_URL to your backend service
# Set Watsonx API credentials in .env

# Start the development server
npm run start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Configuration

Set these environment variables before building:

```bash
EXPO_PUBLIC_WEB_APP_URL=https://your-backend.example.com
WATSONX_API_KEY=your-api-key
WATSONX_PROJECT_ID=your-project-id
```

---

## 📁 Project Structure

```
app/
├── index.tsx              # Landing screen with feature highlights
├── scan-webview.tsx       # Floor plan capture via camera/upload
├── gallery.tsx            # Saved floor plans and layouts
├── preview.tsx            # 3D visualization and editing interface
└── optimize.tsx           # AI optimization and "what-if" scenarios

components/
├── FloorPlanEditor.tsx    # Interactive 2D/3D layout editor
├── CommandInput.tsx       # Natural language command interface
├── ImpactDashboard.tsx    # Metrics and optimization results
└── ConstraintChecker.tsx  # Real-time safety/spacing validation

utils/
├── scanStorage.ts         # AsyncStorage for floor plan metadata
├── nlpParser.ts           # Watsonx integration for command parsing
├── layoutOptimizer.ts     # AI algorithms for spatial optimization
└── exportHelpers.ts       # STL/DXF/PDF export utilities
```

---

## 🎯 Demo Flow (For Hackathon Judges)

1. **Import Existing Layout**
   - Snap photos of factory floor or upload existing CAD file
   - App generates digital twin with equipment positions

2. **Natural Language Commands**
   - Say: "Move the CNC machine closer to the loading dock"
   - Watch AI instantly rearrange layout with spacing calculations

3. **AI Optimization**
   - Enable "Efficiency Mode"
   - See reduced forklift travel distance: 2,400 ft → 1,600 ft
   - View safety violations automatically corrected

4. **"What-If" Scenarios**
   - Ask: "What if we add a second welding station?"
   - Compare 3 layout variants side-by-side
   - See throughput improvement: +15%

5. **Export Results**
   - Download STL for CAD integration
   - Generate work order PDF for installation team
   - Show $120k saved in implementation costs

---

## 🔧 Technical Architecture

### Frontend
- **React Native + Expo Router** (TypeScript)
- **react-native-webview** for 3D visualization (Three.js/Babylon.js)
- **AsyncStorage** for local floor plan persistence

### AI/NLP
- **Watsonx APIs** for natural language processing
- **Watsonx Granite** for spatial reasoning and intent parsing
- Custom optimization algorithms for layout constraints

### Import/Export
- **STL/DXF parsers** for CAD interoperability
- **Image-to-vector conversion** for floor plan scanning
- **Optional LIDAR integration** for enhanced accuracy

### Future Integrations
- **IBM Maximo** for real-time equipment status
- **IBM Geospatial APIs** for advanced layout optimization
- **IBM Cloud Object Storage** for team collaboration

---

## 🛠️ Development Roadmap

### Hackathon Priorities (Next 24 Hours)
- [x] Mobile app infrastructure with Expo Router
- [x] STL import/export foundation
- [ ] Watsonx natural language integration
- [ ] 2D/3D floor layout editor
- [ ] AI optimization algorithms
- [ ] Impact dashboard with metrics
- [ ] "What-if" scenario comparison UI
- [ ] Demo polish and presentation flow

### Post-Hackathon Vision
- Real-time IoT sensor integration (IBM Maximo)
- Collaborative multi-user editing
- Industry-specific templates (automotive, aerospace)
- Mobile AR overlay for on-site validation
- Machine learning from successful layouts

---

## 📊 Impact Metrics

### Potential Savings Per Factory
- **Time saved:** 3–6 weeks → 2 hours
- **Cost saved:** $50k–$200k in downtime/consulting
- **Efficiency gain:** 10–30% throughput improvement
- **Safety improvement:** Zero-violation layouts guaranteed

### Market Size
- **50,000+ manufacturing facilities** in the US
- **14,000+ in Michigan alone** (automotive hub)
- **Average 2–3 re-layouts per year** per facility

---

## 🤝 Contributing

This project was built for the 2025 IBM Michigan Hackathon. For questions or collaboration:

1. Check existing issues or create a new one
2. Fork the repository
3. Create a feature branch
4. Submit a pull request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🏅 Built For

**2025 IBM Michigan Hackathon**

Using IBM Watsonx, Watsonx Granite, and modern mobile development practices to solve real manufacturing pain points in Michigan's industrial heartland.

---

**This is not a "nice to have." This is a painkiller for Michigan manufacturing.**
