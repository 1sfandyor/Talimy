import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common"

import { CreateStudentDto } from "./dto/create-student.dto"
import { UpdateStudentDto } from "./dto/update-student.dto"
import { StudentsService } from "./students.service"

@Controller("students")
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  list(@Query("tenantId") tenantId: string) {
    return this.studentsService.list(tenantId)
  }

  @Get(":id")
  getById(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.studentsService.getById(tenantId, id)
  }

  @Post()
  create(@Body() payload: CreateStudentDto) {
    return this.studentsService.create(payload)
  }

  @Patch(":id")
  update(
    @Query("tenantId") tenantId: string,
    @Param("id") id: string,
    @Body() payload: UpdateStudentDto
  ) {
    return this.studentsService.update(tenantId, id, payload)
  }

  @Delete(":id")
  delete(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.studentsService.delete(tenantId, id)
  }
}
