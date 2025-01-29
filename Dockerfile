FROM node:20.18
RUN mkdir -p /opt/homeflix
WORKDIR /opt/homeflix
COPY package.json /opt/homeflix
RUN npm install
COPY . /opt/homeflix

EXPOSE 3000

CMD ["npm", "start"]
