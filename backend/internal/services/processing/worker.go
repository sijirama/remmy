package processing

import (
	"context"
	"log"
)

type ProcessingJob struct {
	LogID   string
	LogType string
	FileURL string
	UserID  uint
}

type workerPool struct {
	jobs chan ProcessingJob
}

var pool *workerPool

func InitWorkers(n int) {
	pool = &workerPool{
		jobs: make(chan ProcessingJob, 100),
	}
	for i := 0; i < n; i++ {
		go pool.run()
	}
	log.Printf("[Remmy] Processing worker pool started (%d workers)", n)
}

func Enqueue(job ProcessingJob) {
	if pool == nil {
		log.Printf("[Remmy] Worker pool not initialized, dropping job for log %s", job.LogID)
		return
	}
	pool.jobs <- job
}

func (w *workerPool) run() {
	for job := range w.jobs {
		if err := ProcessLog(context.Background(), job); err != nil {
			log.Printf("[Processing] Failed for log %s: %v", job.LogID, err)
		}
	}
}
