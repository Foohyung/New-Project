ALTER TABLE `payments`
  ADD COLUMN `slip_data` MEDIUMTEXT NULL,
  ADD COLUMN `slip_content_type` VARCHAR(40) NULL;

ALTER TABLE `course_enrollments`
  ADD COLUMN `slip_data` MEDIUMTEXT NULL,
  ADD COLUMN `slip_content_type` VARCHAR(40) NULL;
