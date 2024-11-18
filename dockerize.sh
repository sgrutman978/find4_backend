docker build . -t find4_io_backend_server
docker stop find4_io_backend_container
docker rm find4_io_backend_container
docker run --network=host --name find4_io_backend_container -p 49160:3000 -d find4_io_backend_server