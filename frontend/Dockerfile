FROM node:20-alpine AS build
WORKDIR /app
ENV CI=false
ENV INLINE_RUNTIME_CHUNK=false
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
ARG REACT_APP_SUPABASE_URL
ENV REACT_APP_SUPABASE_URL=$REACT_APP_SUPABASE_URL
ARG REACT_APP_SUPABASE_ANON_KEY
ENV REACT_APP_SUPABASE_ANON_KEY=$REACT_APP_SUPABASE_ANON_KEY
COPY package.json ./
RUN npm install --legacy-peer-deps \
    && npm install --legacy-peer-deps ajv@^8.17.1 ajv-keywords@^5.1.0
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
