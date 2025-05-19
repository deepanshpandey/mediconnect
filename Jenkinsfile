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
                        // sh 'docker push coffeeinacafe/mediconnect-webrtc_server'
                        // sh 'docker push coffeeinacafe/mediconnect-frontend'
                        // sh 'docker push coffeeinacafe/mediconnect-backend'
                        sh 'docker compose down'
                    }
                }
            }
        }
        stage('Deploy with ansible') {
            steps {
                ansiblePlaybook becomeUser: null, colorized: true, disableHostKeyChecking: true, installation: 'Ansible', inventory: './ansible_inventory', playbook: './ansible_deploy.yml', sudoUser: null
            }
        }
    }
}