FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY shared ./shared
COPY server ./server
COPY data ./data
COPY licenses ./licenses
ENV PORT=8787 HOST=0.0.0.0
EXPOSE 8787
CMD ["npm", "run", "server"]
