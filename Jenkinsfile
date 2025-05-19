pipeline {
    environment {
        registryCredential = 'dockerhub_id'
    }
    agent any
    stages {
        stage('Git Clone') {
            steps {
                git branch: 'main', url: 'https://github.com/deepanshpandey/mediconnect'
            }
        }
        stage('Install dependancies') {
            steps {
                sh 'cd Backend/ && npm i --legacy-peer-deps'
                sh 'cd Frontend/ && npm i --legacy-peer-deps'
                sh 'cd WebRTC_Signaling_Server/ && npm i --legacy-peer-deps'
                //remove existing running contaienrs if exists
                sh 'docker stop $(docker ps -q)'
                sh 'minikube start' //since we are using minikube, we need to start it first

            } 
        }
        stage('Test') {
            steps {
                sh 'cd Backend/ && cp .env_test .env && npm test'
            }
        }
        stage('Build') {
            steps {
                sh '''
                    cd Backend/
                    cp .env_deploy .env
                    cd ../Frontend/
                    export NODE_OPTIONS=--openssl-legacy-provider
                    ng build
                '''
            }
        }
        stage('Remove Previous Docker Images If Exists') {
            steps {
                sh 'docker rmi mediconnect-webrtc_server mediconnect-frontend mediconnect-backend 2> /dev/null || true'
                sh 'docker rmi coffeeinacafe/mediconnect-webrtc_server coffeeinacafe/mediconnect-frontend coffeeinacafe/mediconnect-backend 2> /dev/null || true'
            }
        }
        stage('Docker containerization') {
            steps {
                sh 'docker compose up --build -d'
                timeout(time: 2, unit: 'MINUTES') {
        }
            }
        }
        stage('Rename Docker Image name to push on Docker Hub') {
            steps {
                sh 'docker tag mediconnect-webrtc_server coffeeinacafe/mediconnect-webrtc_server'
                sh 'docker tag mediconnect-frontend coffeeinacafe/mediconnect-frontend'
                sh 'docker tag mediconnect-backend coffeeinacafe/mediconnect-backend'
            }
        }
        stage('Deploy on Docker Hub') {
            steps {
                script {
                    docker.withRegistry('', 'DockerHubCred') {
                        sh 'docker tag mediconnect-webrtc_server coffeeinacafe/mediconnect-webrtc_server:latest'
                        sh 'docker tag mediconnect-frontend coffeeinacafe/mediconnect-frontend:latest'
                        sh 'docker tag mediconnect-backend coffeeinacafe/mediconnect-backend:latest'
                        sh 'docker push coffeeinacafe/mediconnect-webrtc_server:latest'
                        sh 'docker push coffeeinacafe/mediconnect-frontend:latest'
                        sh 'docker push coffeeinacafe/mediconnect-backend:latest'
                        sh 'docker compose down'
                    }
                }
            }
        }
        stage('Deploy with ansible') {
            steps {
                sh 'echo "1234" > vault_pass.txt'

                ansiblePlaybook(
                    installation: 'Ansible',
                    inventory: './ansible_inventory',
                    playbook: './ansible_deploy.yml',
                    extras: '--vault-password-file vault_pass.txt',
                    colorized: true,
                    disableHostKeyChecking: true
                )

                sh 'rm -f vault_pass.txt'
            }
        }
    }
}