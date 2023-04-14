# Build stage: compile Typescript to Javascript
FROM node:12-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build

# Final stage: copy compiled Javascript from previous stage and install production dependencies
FROM node:12-alpine
ENV NODE_ENV=production
ENV MAINNET_API_KEY=MAINNET_API_KEY
ENV POLYGON_API_KEY=POLYGON_API_KEY
ENV ARBISCAN_API_KEY=ARBISCAN_API_KEY
ENV OPTIMISM_API_KEY=OPTIMISM_API_KEY
ENV AVALANCHE_API_KEY=AVALANCHE_API_KEY
ENV FANTOM_API_KEY=FANTOM_API_KEY
ENV BNB_CHAIN_KEY=BNB_CHAIN_KEY
# Uncomment the following line to enable agent logging
LABEL "network.forta.settings.agent-logs.enable"="true"
WORKDIR /app
COPY --from=builder /app/dist ./src
COPY package*.json ./
RUN npm ci --production
CMD [ "npm", "run", "start:prod" ]  