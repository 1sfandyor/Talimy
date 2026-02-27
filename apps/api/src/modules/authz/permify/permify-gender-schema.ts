export const PERMIFY_GENDER_SCHEMA = `
entity user {}

entity tenant {
  relation platform_admin @user
  relation school_admin @user

  action can_list_gender_resources = platform_admin or school_admin
  action can_mutate_gender_resources = platform_admin or school_admin
}

entity teacher_gender_policy {
  relation tenant @tenant

  action gender_list = tenant.can_list_gender_resources
  action gender_create = tenant.can_mutate_gender_resources
  action gender_update = tenant.can_mutate_gender_resources
}

entity student_gender_policy {
  relation tenant @tenant

  action gender_list = tenant.can_list_gender_resources
  action gender_create = tenant.can_mutate_gender_resources
  action gender_update = tenant.can_mutate_gender_resources
}
`.trim()
