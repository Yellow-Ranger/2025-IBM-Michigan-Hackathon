# PROJECT SUMMARY

## Elevator Pitch
A natural-language digital twin platform that lets factory managers redesign floor layouts in minutes instead of weeks—using plain English commands to optimize equipment placement, simulate workflows, and eliminate costly trial-and-error.

## The Problem We're Solving

Michigan manufacturers lose millions each year to three critical bottlenecks:

### 1. Floor Layout Changes Take Weeks and Cost $50k–$200k
Adding a single CNC machine requires CAD specialists, safety reviews, workflow audits, physical measurements, and painful trial-and-error. Most factories can't afford to optimize frequently.

### 2. Floor Managers Can't Use CAD Tools
Current digital twin software requires specialized skills. Teams make decisions based on gut instinct instead of data-driven simulations.

### 3. No Fast Way to Run "What-If" Scenarios
Testing forklift traffic patterns, material handling bottlenecks, safety spacing, or evacuation routes requires expensive real-world experimentation. Companies guess, then fix mistakes later.

## Our Solution

A mobile-first digital twin platform where factory managers describe what they want using natural language:

> "Move the press brake next to the welding cell."
>
> "Add a new CNC machine and optimize material flow."
>
> "Remove these pallets and widen the walkway to OSHA standards."

The AI instantly:
- Rearranges equipment with realistic dimensions
- Recalculates aisles, clearances, and safety zones
- Highlights violations and suggests optimal layouts
- Shows cost/time impact and throughput changes
- Exports updated plans as STL, DXF, or installation instructions

**No CAD skills needed. No bottlenecks. No guessing.**

## Key Features

### 1. Floor Layout Digital Twin
- 2D/2.5D interactive factory map with scalable equipment blocks
- Realistic distances (feet/meters) with accurate spacing
- Aisles, safety zones, and forklift route visualization

### 2. Natural Language Command Engine
Parse plain English commands like:
- "Shift everything in zone B to the left by 2 feet"
- "Optimize forklift paths"
- "Create a new machining cell"
- "Add 30% more warehouse storage"

### 3. AI Optimization Modes
- **Safety mode:** Auto-correct OSHA spacing requirements
- **Efficiency mode:** Minimize travel distance for workers/materials
- **Throughput mode:** Reduce bottlenecks and maximize flow
- **Simulation mode:** Preview forklift traffic and worker movement

### 4. Impact Dashboard
Real-time metrics showing:
- Estimated throughput increase
- Total walking/forklift distance saved
- Implementation cost estimate
- Time saved from manual planning
- Space utilization percentage

### 5. Import/Export Tools
- Import existing floor plans (image → vector → layout)
- Optional LIDAR or iPhone capture support
- Export as STL, DXF, PDF blueprint, or work orders

### 6. "What If" Scenario Generator
Run instant simulations:
- "What if we add a second welding station?"
- "What if we remove these pallets?"
- "What if we change our assembly order?"
- "What if we expand to the next bay?"

### 7. Real-Time Constraint Checker
Automatically flags:
- Blocked aisles and emergency exits
- OSHA safety violations
- Forklift turning radius issues
- Overlapping equipment footprints
- Power drop conflicts

### 8. IBM Technology Integration
- **Watsonx** for natural language interpretation
- **Watsonx Granite** for intent parsing and layout reasoning
- **IBM Maximo** (optional) for live equipment status integration
- **IBM geospatial/vector search** for layout memory and optimization

## User Experience Flow

1. **Capture Current Layout**
   - Snap photos of the factory floor or upload existing plans
   - App generates a digital twin with equipment positions

2. **Describe Desired Changes**
   - Use natural language commands via mobile interface
   - AI interprets intent and updates layout in real-time

3. **Review & Optimize**
   - See impact metrics (cost, efficiency, safety)
   - Run multiple "what-if" scenarios
   - AI suggests optimal configurations

4. **Export & Implement**
   - Download STL/DXF files for CAD integration
   - Generate work orders for installation teams
   - Share visualizations with stakeholders

## Technical Stack

- **Frontend:** React Native + Expo Router (TypeScript)
- **3D Visualization:** react-native-webview embedding Three.js/Babylon.js
- **AI/NLP:** Watsonx APIs for command parsing and layout optimization
- **Storage:** AsyncStorage for local floor plan metadata
- **Import/Export:** STL/DXF conversion utilities
- **Optional:** LiDAR detection for enhanced floor scanning

## Why This Wins

### Impact
- Saves companies **$50k–$500k per re-layout**
- Reduces planning time from **weeks to minutes**
- Eliminates expensive trial-and-error mistakes
- Improves worker safety and operational efficiency

### Demonstration Value
- Visually impressive 3D floor layouts
- Instant AI-driven transformations
- Clear before/after metrics
- Live "what-if" scenarios during demo

### Market Reach
Transferable across industries:
- Manufacturing (automotive plants—major in Michigan)
- Warehousing and logistics
- Laboratories and cleanrooms
- Retail stores and event spaces
- Office space planning

### Technical Excellence
- Creative AI application (natural language → spatial reasoning)
- Strong IBM technology integration (Watsonx, Granite, Maximo)
- Solves a real, expensive, frequent pain point
- Mobile-first design for accessibility

## Current Status & Next Steps

### Implemented
- Mobile app shell with Expo Router navigation
- WebView integration for 3D visualization
- STL import/export infrastructure
- Gallery management for saved floor plans

### Hackathon Priorities
1. Integrate Watsonx natural language processing
2. Build 2D/3D floor layout editor with constraint checking
3. Implement AI optimization algorithms (safety, efficiency, throughput)
4. Create impact dashboard with cost/efficiency metrics
5. Add "what-if" scenario comparison interface
6. Polish demo flow: import → command → optimize → export

### Post-Hackathon Ideas
- Real-time IoT sensor integration via IBM Maximo
- Collaborative multi-user editing
- Industry-specific templates (automotive, aerospace, warehouse)
- Mobile AR overlay for on-site validation
- Machine learning from successful layouts

---

**This is not a "nice to have." This is a painkiller for Michigan manufacturing.**
