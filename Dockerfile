# 1. Chọn hệ điều hành hoặc môi trường có sẵn (Lớp nền)
FROM node:current-alpine3.22

# 2. Tạo thư mục làm việc trong container
WORKDIR /app

# 3. Sao chép file package.json và package-lock.json vào container
COPY package*.json ./

# 4. Cài đặt các dependencies
RUN npm install

# 6. Mở cổng mà ứng dụng sẽ chạy (ví dụ: 3000)
EXPOSE 3000

# 7. Chạy ứng dụng
CMD ["npm", "run", "dev", "--", "--host"]